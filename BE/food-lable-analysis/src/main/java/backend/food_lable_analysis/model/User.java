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
    private Double height;
    private Double weight;
    private LocalDate birthDate;
    private boolean verified = false;
    private String role = "USER";

    // --- Constructors ---
    public User() {}

    public User(String id, String username, String password,
                String gmail, Double height, Double weight,
                LocalDate birthDate) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.gmail = gmail;
        this.height = height;
        this.weight = weight;
        this.birthDate = birthDate;
        this.role = "USER";
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

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }
    
    public void setVerified() {
    	this.verified = true;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
    
    public boolean isVerified() {
    	return verified;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}

