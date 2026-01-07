package backend.food_lable_analysis.service;

import org.springframework.stereotype.Service;

import backend.food_lable_analysis.dto.AnalyzeResponse;



@Service
public class AnalyzeService {

    public AnalyzeResponse analyze(String labelType) {

        // dummy logic for now
        AnalyzeResponse response = new AnalyzeResponse();
        response.setRating(2);
        response.setExplanation("Dummy explanation for now");

        return response;
    }
}
