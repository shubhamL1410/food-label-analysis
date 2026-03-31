package backend.food_lable_analysis.controller;

import backend.food_lable_analysis.dto.UpdateProfileRequest;
import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.IUserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserProfileController {

    @Autowired
    private IUserRepo userRepository;

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile() {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByGmail(usernameOrEmail))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("username", user.getUsername());
        profile.put("gmail", user.getGmail());
        profile.put("height", user.getHeight());
        profile.put("weight", user.getWeight());
        profile.put("birthDate", user.getBirthDate() != null ? user.getBirthDate().toString() : null);

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody UpdateProfileRequest request) {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByGmail(usernameOrEmail))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(request.getUsername().trim());
        }
        if (request.getHeight() != null && request.getHeight() > 0) {
            user.setHeight(request.getHeight());
        }
        if (request.getWeight() != null && request.getWeight() > 0) {
            user.setWeight(request.getWeight());
        }
        if (request.getBirthDate() != null) {
            user.setBirthDate(request.getBirthDate());
        }

        userRepository.save(user);

        Map<String, Object> profile = new HashMap<>();
        profile.put("username", user.getUsername());
        profile.put("gmail", user.getGmail());
        profile.put("height", user.getHeight());
        profile.put("weight", user.getWeight());
        profile.put("birthDate", user.getBirthDate() != null ? user.getBirthDate().toString() : null);
        profile.put("message", "Profile updated successfully");

        return ResponseEntity.ok(profile);
    }
}
