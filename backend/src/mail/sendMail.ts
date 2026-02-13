import { createTransport } from 'nodemailer'
import { otpEmailTemplate } from './mailTemplate'

const transport = createTransport({
    service: "gmail",
    auth: {
        user: "thedevpiyush@gmail.com",
        pass: process.env.GMAIL_KEY || ""
    }
})

export const sendVerificationOTP = async (verifyCodePayload: string, recipient: string, subject: string) => {

    try {
        const sendMail = await transport.sendMail({
            from: "thedevpiyush@gmail.com",
            to: recipient,
            subject: subject,
            html: otpEmailTemplate(verifyCodePayload)
        })

        if (sendMail.accepted.includes(recipient)) {
            console.info("Verification OTP Sent.")
            return true
        }
    } catch (e: any) {
        return false
    }
}

