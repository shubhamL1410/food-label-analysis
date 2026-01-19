package backend.food_lable_analysis.dto;

public class SuggestionRequest {

    private int rating;
    private String labelType;

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getLabelType() {
        return labelType;
    }

    public void setLabelType(String labelType) {
        this.labelType = labelType;
    }
}
