package backend.food_lable_analysis.dto;

import java.time.LocalDate;

public class UpdateProfileRequest {

    private String username;
    private Double height;
    private Double weight;
    private LocalDate birthDate;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
}
