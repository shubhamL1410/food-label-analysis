package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import backend.food_lable_analysis.service.FoodSuggetionService;

@RestController
@RequestMapping("/api/food")
public class FoodSuggestionControler {

    @Autowired
    private FoodSuggetionService foodSuggestionService;

    @PostMapping("/suggest")
    public String suggest(@RequestParam("image") MultipartFile image) throws Exception {
        return foodSuggestionService.suggestFood(image);
    }
}
