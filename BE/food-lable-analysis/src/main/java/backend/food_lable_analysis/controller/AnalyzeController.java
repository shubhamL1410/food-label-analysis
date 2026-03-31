package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import backend.food_lable_analysis.dto.AnalyzeResponse;
import backend.food_lable_analysis.service.AnalyzeService;

@RestController
public class AnalyzeController {

    private static final String LABEL_TYPE_NUTRITION = "nutrition";

    @Autowired
    private AnalyzeService analyzeService;

    /**
     * Public endpoint for guests: nutrition label analysis only.
     * No authentication. No ingredients. Enforced by SecurityConfig.
     */
    @PostMapping(value = "/api/public/analyze/nutrition", consumes = "multipart/form-data")
    public AnalyzeResponse analyzeNutritionPublic(
            @RequestParam("image") MultipartFile image) {

        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image file is required"
            );
        }

        try {
            byte[] imageBytes = image.getBytes();
            return analyzeService.analyze(imageBytes, LABEL_TYPE_NUTRITION);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to process image"
            );
        }
    }

    /**
     * Authenticated endpoint: nutrition or ingredients analysis.
     * Requires JWT. Enforced by SecurityConfig.
     */
    @PostMapping(value = "/api/analyze", consumes = "multipart/form-data")
    public AnalyzeResponse analyzeFoodLabel(
            @RequestParam("image") MultipartFile image,
            @RequestParam("labelType") String labelType) {

        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Image file is required"
            );
        }

        if (labelType == null || labelType.trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Label type is required"
            );
        }

        String normalized = labelType.trim().toLowerCase();
        if (!LABEL_TYPE_NUTRITION.equals(normalized) && !"ingredient".equals(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Label type must be 'nutrition' or 'ingredient'"
            );
        }

        try {
            byte[] imageBytes = image.getBytes();
            return analyzeService.analyze(imageBytes, labelType);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to process image"
            );
        }
    }
}
