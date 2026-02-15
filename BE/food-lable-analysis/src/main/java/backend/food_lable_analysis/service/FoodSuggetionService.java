package backend.food_lable_analysis.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
@Service
public class FoodSuggetionService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=";

    private static final String PROMPT =
        "You are a nutrition expert. Analyze the given food image and give health suggestion.in brief";

    public String suggestFood(MultipartFile image) throws Exception {

        // image → base64
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
        """.formatted(PROMPT, image.getContentType(), base64);

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .build();


        RequestBody body = RequestBody.create(
                json, MediaType.get("application/json"));

        Request request = new Request.Builder()
                .url(GEMINI_URL + apiKey)
                .post(body)
                .build();

        Response response = client.newCall(request).execute();

        // raw response
        String res = response.body().string();

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(res);

        // 👇 ONLY TEXT RETURN
        return root.get("candidates")
                   .get(0)
                   .get("content")
                   .get("parts")
                   .get(0)
                   .get("text")
                   .asText();
    }
}
