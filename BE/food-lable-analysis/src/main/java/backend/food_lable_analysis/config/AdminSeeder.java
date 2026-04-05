package backend.food_lable_analysis.config;

import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.IUserRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class AdminSeeder implements CommandLineRunner {

    private final IUserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username}")
    private String adminUsername;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    public AdminSeeder(IUserRepo userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepo.findByUsername(adminUsername).isPresent() || userRepo.findByGmail(adminEmail).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setGmail(adminEmail);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setHeight(170.0);
        admin.setWeight(70.0);
        admin.setBirthDate(LocalDate.of(1990, 1, 1));
        admin.setRole("ADMIN");
        admin.setVerified();

        userRepo.save(admin);
    }
}
