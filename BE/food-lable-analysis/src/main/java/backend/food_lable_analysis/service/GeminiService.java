//package backend.food_lable_analysis.service;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//
//import okhttp3.MediaType;
//import okhttp3.OkHttpClient;
//import okhttp3.Request;
//import okhttp3.RequestBody;
//import okhttp3.Response;
//
//@Service
//public class GeminiService {
//
//    @Value("${gemini.api.key}")
//    private String apiKey;
//
//    private static final String GEMINI_URL =
//    	    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=";
//
//
//    public String generateResponse(String prompt) throws Exception {
//
//        OkHttpClient client = new OkHttpClient();
//
//        String jsonBody = """
//        {
//          "contents": [
//            {
//              "parts": [
//                {
//                  "text": "%s"
//                }
//              ]
//            }
//          ]
//        }
//        """.formatted(prompt);
//
//        RequestBody body = RequestBody.create(
//                jsonBody,
//                MediaType.get("application/json")
//        );
//
//        Request request = new Request.Builder()
//                .url(GEMINI_URL + apiKey)
//                .post(body)
//                .build();
//
//        Response response = client.newCall(request).execute();
//
//        return response.body().string();
//    }
//}
