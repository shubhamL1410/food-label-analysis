package backend.food_lable_analysis.ml;

import org.springframework.stereotype.Component;

@Component("nutritionModel")
public class NutritionFoodLabelModel implements IFoodLabelModel {

    @Override
    public int predictRating(byte[] imageData) {
        return 3; // dummy nutrition rating
    }
}
