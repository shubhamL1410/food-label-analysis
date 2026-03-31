package backend.food_lable_analysis.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import backend.food_lable_analysis.dto.RegisterRequest;
import backend.food_lable_analysis.dto.VerifyOtpRequest;
import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.IUserRepo;
import backend.food_lable_analysis.service.JwtService;
import backend.food_lable_analysis.service.OtpService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class UserController {

    @Autowired
    private IUserRepo userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private OtpService otpService;

    @Autowired
    private JwtService jwtService;

    // =========================
    // SEND OTP
    // =========================
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();

        if (normalizedEmail.isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        User existingUser = userRepository.findByGmail(normalizedEmail).orElse(null);
        if (existingUser != null && existingUser.isVerified()) {
            return ResponseEntity.badRequest().body("An account with this email already exists");
        }

        if (existingUser == null) {
            User pendingUser = new User();
            pendingUser.setGmail(normalizedEmail);
            pendingUser.setRole("USER");
            pendingUser.setVerified(false);
            userRepository.save(pendingUser);
        }

        otpService.sendOtp(normalizedEmail);
        return ResponseEntity.ok("OTP Sent Successfully");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {
        String email = request.getGmail() == null ? "" : request.getGmail().trim().toLowerCase();
        String otp = request.getOtp() == null ? "" : request.getOtp().trim();

        if (email.isEmpty() || otp.isEmpty()) {
            return ResponseEntity.badRequest().body("Email and OTP are required");
        }

        User user = userRepository.findByGmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Please request OTP first");
        }

        if (user.isVerified()) {
            return ResponseEntity.ok("Email already verified");
        }

        boolean valid = otpService.verifyOtp(email, otp);
        if (!valid) {
            return ResponseEntity.badRequest().body("Invalid or Expired OTP");
        }

        user.setVerified(true);
        userRepository.save(user);
        return ResponseEntity.ok("OTP verified successfully");
    }

    // =========================
    // REGISTER USER
    // =========================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        String email = request.getGmail() == null ? "" : request.getGmail().trim().toLowerCase();

        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        User user = userRepository.findByGmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Please request OTP first");
        }

        if (!user.isVerified()) {
            return ResponseEntity.badRequest().body("Please verify OTP first");
        }

        User usernameOwner = userRepository.findByUsername(request.getUsername()).orElse(null);
        if (usernameOwner != null && !usernameOwner.getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body("Username is already taken");
        }

        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setGmail(email);
        user.setHeight(request.getHeight());
        user.setWeight(request.getWeight());
        user.setBirthDate(request.getBirthDate());
        user.setRole("USER");
        user.setVerified(true);

        userRepository.save(user);

        return ResponseEntity.ok("Registered Successfully");
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {

        String usernameOrEmail = request.get("usernameOrEmail");
        String password = request.get("password");

        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByGmail(usernameOrEmail))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        if (!user.isVerified()) {
            return ResponseEntity.badRequest()
                    .body("Please verify OTP first");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        usernameOrEmail,
                        password
                )
        );

        String token = jwtService.generateToken(usernameOrEmail);
        String role = user.getRole() == null ? "USER" : user.getRole().toUpperCase();

        return ResponseEntity.ok(
                Map.of(
                        "token", token,
                        "message", "Login successful",
                        "role", role,
                        "isAdmin", "ADMIN".equals(role)
                )
        );
    }
}
