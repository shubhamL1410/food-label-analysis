package backend.food_lable_analysis.ml;

import org.springframework.stereotype.Component;

@Component("ingredientModel")
public class IngredientFoodLabelModel implements IFoodLabelModel {

    @Override
    public int predictRating(byte[] imageData) {
        return 1; // dummy ingredient rating
    }
}
