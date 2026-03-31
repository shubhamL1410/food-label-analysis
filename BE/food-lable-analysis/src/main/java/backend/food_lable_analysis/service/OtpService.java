package backend.food_lable_analysis.service;

import backend.food_lable_analysis.model.OtpVerification;
import backend.food_lable_analysis.repository.OtpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class OtpService {

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private EmailService emailService;

    // ========================
    // SEND OTP
    // ========================
    public void sendOtp(String email) {

        String otp = String.valueOf(100000 + new Random().nextInt(900000));

        LocalDateTime expiry = LocalDateTime.now().plusMinutes(5);

        // Remove old OTP if exists
        otpRepository.deleteByEmail(email);

        OtpVerification otpData =
                new OtpVerification(email, otp, expiry);

        otpRepository.save(otpData);

        emailService.sendOtp(email, otp);
    }

    // ========================
    // VERIFY OTP
    // ========================
    public boolean verifyOtp(String email, String otp) {

        OtpVerification data =
                otpRepository.findByEmail(email).orElse(null);

        if (data == null)
            return false;

        if (data.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpRepository.deleteByEmail(email);
            return false;
        }

        boolean valid = data.getOtp().equals(otp);

        return valid;
    }
}
