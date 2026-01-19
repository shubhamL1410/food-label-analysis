package backend.food_lable_analysis.ml;

public interface IFoodLabelModel {
	int predictRating(byte[] imageData);
}

