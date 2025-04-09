export const emailTemplate = (otp) => {
    return `
        <p>Xin chào,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu từ tài khoản có liên kết với số điện thoại và email của bạn.</p>
        <p>Vui lòng sử dụng mã OTP dưới đây để xác thực yêu cầu:</p>
        <h2 style="color: #2e86de;">${otp}</h2>
        <p>Mã này có hiệu lực trong vòng <strong>5 phút</strong>.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <br>
        <p>Trân trọng,</p>
        <p>Đội ngũ hỗ trợ TingTingApp</p>
    `;
}