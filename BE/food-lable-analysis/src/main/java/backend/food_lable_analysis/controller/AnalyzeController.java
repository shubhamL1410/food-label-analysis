package backend.food_lable_analysis.controller;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import backend.food_lable_analysis.dto.AnalyzeResponse;
import backend.food_lable_analysis.service.AnalyzeService;

@RestController
public class AnalyzeController {
	
	@Autowired
	private AnalyzeService analyzeService;
	
	@PostMapping("/analyze")
	public AnalyzeResponse analyzeFoodLabel(
	        @RequestParam MultipartFile image,
	        @RequestParam String labelType) {

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


	    return analyzeService.analyze(labelType);
	}


}