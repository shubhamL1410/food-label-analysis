package backend.food_lable_analysis.ml;

import org.springframework.stereotype.Component;

@Component
public class DummyFoodLabelModel implements IFoodLabelModel {

    @Override
    public int predictRating(byte[] imageData) {
        // Dummy ML logic for now
        return 2;
    }
}
