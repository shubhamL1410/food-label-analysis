package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import backend.food_lable_analysis.model.AnalysisHistory;
import backend.food_lable_analysis.service.AnalysisHistoryService;
import backend.food_lable_analysis.service.FoodSuggetionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/food")
public class FoodSuggestionControler {

    @Autowired
    private FoodSuggetionService foodSuggestionService;

    @Autowired
    private AnalysisHistoryService analysisHistoryService;

    @PostMapping("/suggest")
    public String suggest(@RequestParam("image") MultipartFile image) throws Exception {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return foodSuggestionService.suggestFood(image, usernameOrEmail);
    }
    @PostMapping("/analyze-text")
    public String analyzeExtractedText(@RequestBody Map<String, String> body) {
        if (body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        String extractedText = body.get("extractedText");
        if (extractedText == null || extractedText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Extracted text is required");
        }
        String labelType = body.get("labelType");
        if (labelType == null || labelType.isBlank()) {
            labelType = "nutrition";
        } else {
            labelType = labelType.trim();
        }
        try {
            return foodSuggestionService.analyzeExtractedText(extractedText, labelType);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to analyze text: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")
            );
        }
    }

    @PostMapping("/history")
    public AnalysisHistory saveHistory(@RequestBody Map<String, String> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String extractedLabel = body.get("extractedLabel");
        String labelType = body.get("labelType");
        Integer healthScore = parseHealthScore(body.get("healthScore"));
        String geminiAnalysis = body.get("geminiAnalysis");
        String suggestion = body.get("suggestion");
        if (extractedLabel == null || extractedLabel.isBlank() || geminiAnalysis == null || geminiAnalysis.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "extractedLabel and geminiAnalysis are required");
        }
        return analysisHistoryService.save(
                userId,
                extractedLabel,
                labelType != null ? labelType : "nutrition",
                healthScore,
                geminiAnalysis,
                suggestion
        );
    }

    @PatchMapping("/history/{id}")
    public AnalysisHistory updateHistorySuggestion(@PathVariable String id, @RequestBody Map<String, String> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String suggestion = body != null ? body.get("suggestion") : null;
        return analysisHistoryService.updateSuggestion(id, userId, suggestion)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
    }

    @GetMapping("/history")
    public List<AnalysisHistory> getHistory() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return analysisHistoryService.findByUserId(userId);
    }

    private Integer parseHealthScore(String score) {
        if (score == null || score.isBlank()) {
            return null;
        }
        try {
            int parsed = Integer.parseInt(score.trim());
            return Math.max(0, Math.min(100, parsed));
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
