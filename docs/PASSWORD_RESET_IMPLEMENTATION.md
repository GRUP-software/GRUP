# Password Reset Implementation - Secret Recovery Key Approach

## Overview

This implementation provides a secure password reset flow using secret recovery keys instead of email/OTP verification. Users create a secret recovery key during signup and can use it to reset their password if forgotten.

## Security Features

- ✅ **Secret recovery keys are hashed** using bcrypt (same as passwords)
- ✅ **No plaintext storage** of recovery keys in database
- ✅ **Temporary reset tokens** with 15-minute expiration
- ✅ **Rate limiting** through existing infrastructure
- ✅ **Secure token verification** with JWT
- ✅ **Password validation** (minimum 6 characters)
- ✅ **Recovery key validation** (minimum 8 characters)

## Database Changes

### User Model Updates (`backend/models/User.js`)

```javascript
// Added to userSchema
secretRecoveryKey: {
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      return v && v.length >= 8;
    },
    message: 'Secret recovery key must be at least 8 characters long'
  }
}

// Added to pre-save hook
if (this.isModified("secretRecoveryKey")) {
  this.secretRecoveryKey = await bcrypt.hash(this.secretRecoveryKey, 10)
}

// Added method
userSchema.methods.compareSecretRecoveryKey = function (plainRecoveryKey) {
  return bcrypt.compare(plainRecoveryKey, this.secretRecoveryKey)
}
```

## Backend Implementation

### New Controller Methods (`backend/controllers/authController.js`)

1. **`verifyRecoveryKey`** - Verifies user's secret recovery key
2. **`resetPassword`** - Resets password using verified recovery key
3. **`updateSecretRecoveryKey`** - Allows authenticated users to update their recovery key

### New Routes (`backend/routes/auth.js`)

```javascript
// Password reset routes
router.post("/verify-recovery-key", verifyRecoveryKey);
router.post("/reset-password", resetPassword);
router.patch("/update-recovery-key", verifyToken, updateSecretRecoveryKey);
```

### API Endpoints

#### 1. Verify Recovery Key

```
POST /api/auth/verify-recovery-key
Body: { email, secretRecoveryKey }
Response: { resetToken, user: { id, email, name } }
```

#### 2. Reset Password

```
POST /api/auth/reset-password
Body: { resetToken, newPassword }
Response: { token, user: { id, name, email, referralCode } }
```

#### 3. Update Recovery Key (Authenticated)

```
PATCH /api/auth/update-recovery-key
Headers: Authorization: Bearer <token>
Body: { currentPassword, newSecretRecoveryKey }
Response: { message }
```

## Frontend Implementation

### Signup Form Updates (`frontend/src/pages/accounts/SignUp.jsx`)

- Added secret recovery key field
- Added validation (minimum 8 characters)
- Added helpful description text
- Integrated with existing signup flow

### Forgot Password Flow (`frontend/src/pages/accounts/ForgotPassword.jsx`)

**Step 1: Verify Recovery Key**

- User enters email and secret recovery key
- System verifies and returns reset token
- Shows validation errors if incorrect

**Step 2: Reset Password**

- User enters new password and confirmation
- System resets password using reset token
- Redirects to login with success message

### Profile Management (`frontend/src/pages/profile/components/UpdateRecoveryKey.jsx`)

- New component for updating recovery key
- Requires current password verification
- Integrated into user profile page
- Shows success/error messages

## User Flow

### New User Registration

1. User fills signup form including secret recovery key
2. System validates and hashes recovery key
3. User account created with recovery key stored

### Password Reset Process

1. User visits "Forgot Password" page
2. User enters email and secret recovery key
3. System verifies recovery key and generates reset token
4. User enters new password
5. System updates password and logs user in

### Recovery Key Management

1. User visits profile page
2. User can update recovery key with current password verification
3. System validates and updates recovery key

## Migration for Existing Users

### Migration Script (`backend/scripts/migrate-recovery-keys.mjs`)

```bash
# Run migration script
node backend/scripts/migrate-recovery-keys.mjs
```

This script:

- Finds users without secret recovery keys
- Sets temporary recovery keys for existing users
- Logs migration progress
- Provides warnings about temporary keys

## Security Considerations

### Password Security

- All passwords hashed with bcrypt (salt rounds: 10)
- Minimum 6 characters required
- Passwords never stored in plaintext

### Recovery Key Security

- All recovery keys hashed with bcrypt (salt rounds: 10)
- Minimum 8 characters required
- Recovery keys never stored in plaintext
- Comparison done using bcrypt.compare()

### Token Security

- Reset tokens expire after 15 minutes
- Tokens include user ID and type verification
- JWT signed with environment secret

### Rate Limiting

- Existing rate limiting infrastructure applies
- Failed attempts are logged
- No brute force protection needed (bcrypt is slow)

## Error Handling

### Common Error Scenarios

1. **Invalid email** - "User not found"
2. **Invalid recovery key** - "Invalid secret recovery key"
3. **Expired token** - "Invalid or expired reset token"
4. **Weak password** - "Password must be at least 6 characters long"
5. **Weak recovery key** - "Secret recovery key must be at least 8 characters long"

### Frontend Error Display

- Clear error messages for users
- Form validation before submission
- Loading states during API calls
- Success messages after completion

## Testing

### Manual Testing Checklist

- [ ] New user signup with recovery key
- [ ] Password reset with correct recovery key
- [ ] Password reset with incorrect recovery key
- [ ] Password reset with expired token
- [ ] Recovery key update in profile
- [ ] Validation of minimum lengths
- [ ] Error message display
- [ ] Success message display

### API Testing

```bash
# Test verify recovery key
curl -X POST http://localhost:5000/api/auth/verify-recovery-key \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","secretRecoveryKey":"mysecretkey"}'

# Test reset password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"resetToken":"<token>","newPassword":"newpassword123"}'
```

## Deployment Notes

### Environment Variables

- `JWT_SECRET` - Used for signing reset tokens
- `MONGO_URI` - Database connection string

### Database Migration

1. Run migration script for existing users
2. Monitor for any users without recovery keys
3. Consider forcing recovery key setup on next login

### Monitoring

- Monitor password reset attempts
- Log failed recovery key verifications
- Track successful password resets
- Monitor for suspicious activity

## Future Enhancements

### Potential Improvements

1. **Recovery key strength validation** - Check for common patterns
2. **Password history** - Prevent reuse of recent passwords
3. **Account lockout** - Temporary lockout after failed attempts
4. **Audit logging** - Detailed logs of all password operations
5. **Recovery key hints** - Optional hints for forgotten keys

### Security Enhancements

1. **Multi-factor authentication** - Combine with SMS/email verification
2. **Device verification** - Require verification on new devices
3. **IP-based restrictions** - Limit resets from unknown locations
4. **Time-based restrictions** - Limit reset frequency

## Support

For issues or questions about this implementation:

1. Check error logs in backend console
2. Verify database connection and schema
3. Test API endpoints manually
4. Review frontend network requests
5. Check JWT token validity and expiration
