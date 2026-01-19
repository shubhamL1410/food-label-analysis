package backend.food_lable_analysis.service;

import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.Service;

import backend.food_lable_analysis.dto.AnalyzeResponse;
import backend.food_lable_analysis.ml.IFoodLabelModel;



@Service
public class AnalyzeService {
	
	@Autowired
	@Qualifier("nutritionModel")
	private IFoodLabelModel nutritionModel;

	@Autowired
	@Qualifier("ingredientModel")
	private IFoodLabelModel ingredientModel;

	
	@Autowired
	private GeminiService geminiService;
	
	
	public AnalyzeResponse analyze(byte[] imageData, String labelType) {

	    int rating;

	    if ("nutrition".equalsIgnoreCase(labelType)) {
	        rating = nutritionModel.predictRating(imageData);
	    } else if ("ingredient".equalsIgnoreCase(labelType)) {
	        rating = ingredientModel.predictRating(imageData);
	    } else {
	        rating = 0;
	    }

	    String explanation = geminiService.generateExplanation(rating, labelType);
	    
	    AnalyzeResponse response = new AnalyzeResponse();
	    response.setRating(rating);
	    response.setExplanation(explanation);

	    return response;
	}


}
 