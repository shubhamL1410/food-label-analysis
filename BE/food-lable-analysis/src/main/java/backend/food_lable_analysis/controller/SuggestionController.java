package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;


import backend.food_lable_analysis.dto.SuggestionRequest;
import backend.food_lable_analysis.service.GeminiService;

@RestController
public class SuggestionController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/suggest")
    public String getSuggestion(@RequestBody SuggestionRequest request) {

        return geminiService.generateSuggestion(
                request.getRating(),
                request.getLabelType()
        );
    }
}
