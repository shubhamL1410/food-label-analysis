package backend.food_lable_analysis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String username;
    private String password;
    private String gmail;
    private double height;
    private double weight;
    private LocalDate birthDate;

    // --- Constructors ---
    public User() {}

    public User(String id, String username, String password,
                String gmail, double height, double weight,
                LocalDate birthDate) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.gmail = gmail;
        this.height = height;
        this.weight = weight;
        this.birthDate = birthDate;
    }

    // --- Getters and Setters ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getGmail() {
        return gmail;
    }

    public void setGmail(String gmail) {
        this.gmail = gmail;
    }

    public double getHeight() {
        return height;
    }

    public void setHeight(double height) {
        this.height = height;
    }

    public double getWeight() {
        return weight;
    }

    public void setWeight(double weight) {
        this.weight = weight;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }
}
