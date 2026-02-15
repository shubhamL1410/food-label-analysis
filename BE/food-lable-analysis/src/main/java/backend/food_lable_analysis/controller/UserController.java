package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.AuthenticationManager;
import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.IUserRepo;
import backend.food_lable_analysis.service.JwtService;

import java.util.*;

@RestController
@RequestMapping("/auth")
public class UserController {

    @Autowired
    private IUserRepo userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    // =========================
    // ✅ REGISTER
    // =========================
    @PostMapping("/register")
    public Map<String, String> register(@RequestBody User user) {

        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return Map.of("message", "Username already exists!");
        }

        if (userRepository.findByGmail(user.getGmail()).isPresent()) {
            return Map.of("message", "Email already exists!");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);

        return Map.of("message", "User registered successfully!");
    }

    // =========================
    // ✅ LOGIN (username OR gmail)
    // =========================
    @Autowired
    private JwtService jwtService;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {

        String usernameOrEmail = request.get("usernameOrEmail");
        String password = request.get("password");

        System.out.println("LOGIN ATTEMPT: " + usernameOrEmail);

        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByGmail(usernameOrEmail))
                .orElse(null);

        if(user == null){
            System.out.println("USER NOT FOUND");
        } else {
            System.out.println("FOUND USER: " + user.getUsername());
            System.out.println("DB PASSWORD: " + user.getPassword());
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        usernameOrEmail,
                        password
                )
        );

        String token = jwtService.generateToken(usernameOrEmail);

        return Map.of(
                "token", token,
                "message", "Login successful!"
        );
    }


}
