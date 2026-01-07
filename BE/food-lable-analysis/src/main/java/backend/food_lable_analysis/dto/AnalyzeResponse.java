package backend.food_lable_analysis.dto;

public class AnalyzeResponse {

    private int rating;
    private String explanation;

    public AnalyzeResponse() {
    }

    public AnalyzeResponse(int rating, String explanation) {
        this.rating = rating;
        this.explanation = explanation;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }
}
