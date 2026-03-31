package backend.food_lable_analysis.service;

import backend.food_lable_analysis.dto.AnalyzeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.BodyInserters;

@Service
public class AnalyzeService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    public AnalyzeService(WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    public AnalyzeResponse analyze(byte[] imageData, String labelType) {

        String endpoint = labelType.equalsIgnoreCase("nutrition")
                ? "/predict/nutrition"
                : "/predict/ingredient";

        JsonNode resultNode = webClient.post()
                .uri(fastApiBaseUrl + endpoint)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData("file",
                        new ByteArrayResource(imageData) {
                            @Override
                            public String getFilename() {
                                return "image.jpg";
                            }
                        }))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        AnalyzeResponse response = new AnalyzeResponse();
        if (resultNode == null) {
            response.setExplanation("No response from prediction service");
            return response;
        }

        JsonNode predictionNode = resultNode.get("prediction");
        String prediction = predictionNode != null && !predictionNode.isNull()
                ? predictionNode.asText()
                : "Prediction unavailable";

        JsonNode scoreNode = resultNode.get("health_score");
        Integer healthScore = scoreNode != null && scoreNode.isNumber()
                ? scoreNode.asInt()
                : null;

        response.setPrediction(prediction);
        response.setExplanation(prediction);
        response.setHealthScore(healthScore);
        response.setRawResponse(safeToJson(resultNode));

        return response;
    }

    private String safeToJson(JsonNode resultNode) {
        try {
            return objectMapper.writeValueAsString(resultNode);
        } catch (Exception ex) {
            return resultNode.toString();
        }
    }
}
