package backend.food_lable_analysis.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtp(String toEmail, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("OTP Verification - Food Label Analysis");

        message.setText(
                "Hello,\n\n" +
                "Your One-Time Password (OTP) for verification is: " + otp + "\n\n" +
                "This OTP is valid for 5 minutes. Please do not share it with anyone.\n\n" +
                "If you did not request this OTP, please ignore this email.\n\n" +
                "Regards,\n" +
                "Food Label Analysis Team"
        );

        mailSender.send(message);
    }
}