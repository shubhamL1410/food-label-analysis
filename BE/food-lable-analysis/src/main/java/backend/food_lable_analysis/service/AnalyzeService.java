package backend.food_lable_analysis.service;

import org.springframework.beans.factory.annotation.*;
import org.springframework.stereotype.Service;

import backend.food_lable_analysis.dto.AnalyzeResponse;



@Service
public class AnalyzeService {
	
	
//	@Autowired
//	private GeminiService geminiService;
	
	
	public AnalyzeResponse analyze(byte[] imageData, String labelType) {

	    int rating=1;

	    
	    AnalyzeResponse response = new AnalyzeResponse();
	    response.setRating(rating);

	    return response;
	}


}
 