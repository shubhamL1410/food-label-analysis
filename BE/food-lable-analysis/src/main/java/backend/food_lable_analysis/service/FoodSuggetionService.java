package backend.food_lable_analysis.service;

import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.IUserRepo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.Period;
import java.util.Base64;

@Service
public class FoodSuggetionService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Autowired
    private IUserRepo userRepository;

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=";

    private static final String PROMPT_SUGGEST_IMAGE_GENERIC =
        "You are a nutrition expert. Analyze the given food image and give health suggestion.in brief";

    private static final String PROMPT_ANALYZE_NUTRITION =
        "You are a nutrition expert. Below is extracted text from a food nutrition facts label. " +
        "Analyze it clearly: explain what the values mean, highlight notable amounts (e.g. high sugar/sodium), " +
        "and give a brief, practical summary for the consumer. Keep the response concise and helpful.";

    private static final String PROMPT_ANALYZE_INGREDIENTS =
        "You are a nutrition expert. Below is extracted text from a food ingredients list. " +
        "Analyze it: explain what key ingredients are, flag any allergens or additives if obvious, " +
        "and give a brief, practical summary for the consumer. Keep the response concise and helpful.";

    /**
     * Suggests food advice with optional user personalization.
     * If usernameOrEmail is provided and user exists with profile data, uses personalized prompt.
     */
    public String suggestFood(MultipartFile image, String usernameOrEmail) throws Exception {
        String prompt = PROMPT_SUGGEST_IMAGE_GENERIC;

        if (usernameOrEmail != null && !usernameOrEmail.isBlank()) {
            User user = userRepository.findByUsername(usernameOrEmail)
                    .or(() -> userRepository.findByGmail(usernameOrEmail))
                    .orElse(null);

            if (user != null && user.getHeight() > 0 && user.getWeight() > 0) {
                int age = calculateAge(user.getBirthDate());
                double bmi = calculateBmi(user.getHeight(), user.getWeight());
                String bmiCategory = getBmiCategory(bmi);

                prompt = """
                    You are a certified nutrition expert.

                    Analyze the given food image and provide brief, practical health advice.

                    User Profile:
                    - Age: %d years
                    - Height: %.1f cm
                    - Weight: %.1f kg
                    - BMI: %.1f (%s)

                    Instructions:
                    - Consider the user's BMI and age while giving advice.
                    - Mention whether the food is suitable or not.
                    - Suggest portion control if needed.
                    - Keep response concise and practical.
                    """.formatted(age, user.getHeight(), user.getWeight(), bmi, bmiCategory);
            }
        }

        String base64 = Base64.getEncoder().encodeToString(image.getBytes());

        String json = """
            {
              "contents": [{
                "parts": [
                  { "text": "%s" },
                  {
                    "inline_data": {
                      "mime_type": "%s",
                      "data": "%s"
                    }
                  }
                ]
              }]
            }
            """.formatted(escapeJson(prompt), image.getContentType(), base64);

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        RequestBody body = RequestBody.create(json, MediaType.get("application/json"));
        Request request = new Request.Builder()
                .url(GEMINI_URL + apiKey)
                .post(body)
                .build();

        Response response = client.newCall(request).execute();
        String res = response.body().string();

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(res);

        return root.get("candidates")
                   .get(0)
                   .get("content")
                   .get("parts")
                   .get(0)
                   .get("text")
                   .asText();
    }

    /**
     * Sends the extracted label text (nutrition or ingredients) to Gemini
     * and returns an analysis of that text for the user.
     */
    public String analyzeExtractedText(String extractedText, String labelType) throws Exception {
        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException("Extracted text is required");
        }
        String prompt = "ingredient".equalsIgnoreCase(labelType != null ? labelType.trim() : "")
                ? PROMPT_ANALYZE_INGREDIENTS
                : PROMPT_ANALYZE_NUTRITION;
        String fullPrompt = prompt + "\n\n--- Extracted label text ---\n\n" + extractedText;

        String json = """
            {
              "contents": [{
                "parts": [{ "text": "%s" }]
              }]
            }
            """.formatted(escapeJson(fullPrompt));

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        RequestBody body = RequestBody.create(json, MediaType.get("application/json"));
        Request request = new Request.Builder()
                .url(GEMINI_URL + apiKey)
                .post(body)
                .build();

        Response response = client.newCall(request).execute();
        String res = response.body().string();

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(res);

        return root.get("candidates")
                .get(0)
                .get("content")
                .get("parts")
                .get(0)
                .get("text")
                .asText();
    }

    private static int calculateAge(LocalDate birthDate) {
        if (birthDate == null) return 0;
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

    private static double calculateBmi(double heightCm, double weightKg) {
        if (heightCm <= 0) return 0;
        double heightM = heightCm / 100.0;
        return weightKg / (heightM * heightM);
    }

    private static String getBmiCategory(double bmi) {
        if (bmi <= 0) return "Unknown";
        if (bmi < 18.5) return "Underweight";
        if (bmi < 25) return "Normal";
        if (bmi < 30) return "Overweight";
        return "Obese";
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
