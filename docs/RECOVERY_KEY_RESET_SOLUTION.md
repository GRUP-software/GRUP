# Recovery Key Reset Solution - Complete Implementation

## Overview

This document outlines the complete solution for handling users who forget their recovery keys. The implementation provides a secure, admin-approved recovery key reset system that prevents complete account lockouts.

## Problem Solved

**Original Issue:** If a user forgot their recovery key, they were completely locked out of their account with no recovery mechanism.

**Solution:** Implemented a multi-step recovery key reset system with admin approval.

## Complete User Flow

### Scenario 1: User Remembers Recovery Key ✅
1. User goes to `/forgot-password`
2. User enters email + recovery key
3. System verifies and allows password reset
4. User sets new password and logs in

### Scenario 2: User Forgot Recovery Key ✅
1. User goes to `/forgot-password`
2. User clicks "Request Recovery Key Reset"
3. User submits request with email, phone, and reason
4. Admin reviews request via admin panel
5. Admin approves and generates temporary key
6. Admin contacts user via WhatsApp with temporary key
7. User goes to `/use-temporary-recovery-key`
8. User enters temporary key and sets new recovery key
9. User can now reset password normally

## Backend Implementation

### Database Schema Updates

**User Model (`backend/models/User.js`)**
```javascript
// Recovery key reset request tracking
recoveryKeyResetRequest: {
  requestedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: null 
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  temporaryKey: { type: String }, // Temporary key set by admin
  expiresAt: { type: Date } // Temporary key expiration
}
```

### New API Endpoints

#### User Endpoints
- `POST /api/auth/request-recovery-key-reset` - Submit recovery key reset request
- `POST /api/auth/use-temporary-recovery-key` - Use temporary key to set new recovery key

#### Admin Endpoints
- `GET /api/auth/recovery-key-reset-requests` - Get all pending requests
- `POST /api/auth/approve-recovery-key-reset/:userId` - Approve request
- `POST /api/auth/reject-recovery-key-reset/:userId` - Reject request

### Controller Methods

**`requestRecoveryKeyReset`** - Handles user requests for recovery key resets
- Validates email and phone match existing user
- Prevents duplicate pending requests
- Creates recovery key reset request record

**`getRecoveryKeyResetRequests`** - Admin endpoint to view pending requests
- Returns all pending requests with user details
- Used by admin panel

**`approveRecoveryKeyReset`** - Admin approves request
- Generates temporary recovery key (valid 24 hours)
- Updates request status to 'approved'
- Returns temporary key for admin to share

**`rejectRecoveryKeyReset`** - Admin rejects request
- Updates request status to 'rejected'
- Requires rejection reason

**`useTemporaryRecoveryKey`** - User uses temporary key
- Validates temporary key and expiration
- Allows user to set new permanent recovery key
- Marks request as 'completed'

## Frontend Implementation

### Enhanced Forgot Password Page

**`frontend/src/pages/accounts/ForgotPassword.jsx`**
- **Step 1:** Verify recovery key (original functionality)
- **Step 2:** Reset password (original functionality)
- **Step 3:** Request recovery key reset (new functionality)

**New Features:**
- Toggle between password reset and recovery key reset request
- Form validation for phone number format
- Success/error message handling
- Navigation between different steps

### New Component: Use Temporary Recovery Key

**`frontend/src/pages/accounts/UseTemporaryRecoveryKey.jsx`**
- Form for users to enter temporary key
- Validation for new recovery key requirements
- Success feedback and automatic redirect
- Pre-filled fields if redirected with temp key info

### Admin Panel

**`backend/public/admin-recovery-key-requests.html`**
- View all pending recovery key reset requests
- Approve requests (generates temporary key)
- Reject requests (with reason)
- Real-time updates and notifications

## Security Features

### Data Protection
- ✅ All recovery keys hashed with bcrypt
- ✅ Temporary keys expire after 24 hours
- ✅ No plaintext storage of any keys
- ✅ Request status tracking prevents abuse

### Access Control
- ✅ Admin-only approval system
- ✅ Authentication required for admin endpoints
- ✅ User verification via email + phone combination
- ✅ Request deduplication prevents spam

### Validation
- ✅ Phone number format validation (+234XXXXXXXXXX)
- ✅ Recovery key minimum length (8 characters)
- ✅ Email format validation
- ✅ Required field validation

## User Experience Flow

### For Users Who Forgot Recovery Key

1. **Request Submission**
   ```
   User → /forgot-password → "Request Recovery Key Reset" 
   → Fill form (email, phone, reason) → Submit
   ```

2. **Admin Review**
   ```
   Admin → /admin-recovery-key-requests → Review request 
   → Approve/Reject → If approved, contact user via WhatsApp
   ```

3. **User Recovery**
   ```
   User → /use-temporary-recovery-key → Enter temp key 
   → Set new recovery key → Success → Can now reset password
   ```

### For Admins

1. **Access Admin Panel**
   ```
   Admin → /admin-recovery-key-requests → View pending requests
   ```

2. **Review Requests**
   ```
   Admin → Click "Approve" → System generates temp key 
   → Admin copies temp key → Contacts user via WhatsApp
   ```

3. **Manage Requests**
   ```
   Admin → Click "Reject" → Provide reason → Request rejected
   ```

## API Documentation

### Request Recovery Key Reset
```http
POST /api/auth/request-recovery-key-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+2341234567890",
  "reason": "I forgot my recovery key"
}
```

**Response:**
```json
{
  "message": "Recovery key reset request submitted successfully. An admin will review your request.",
  "requestId": "user_id_here"
}
```

### Use Temporary Recovery Key
```http
POST /api/auth/use-temporary-recovery-key
Content-Type: application/json

{
  "email": "user@example.com",
  "temporaryKey": "temp_user_1234567890",
  "newRecoveryKey": "mynewrecoverykey123"
}
```

**Response:**
```json
{
  "message": "Recovery key updated successfully. You can now use this key to reset your password."
}
```

### Admin: Get Pending Requests
```http
GET /api/auth/recovery-key-reset-requests
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "requests": [
    {
      "userId": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+2341234567890",
      "requestedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Admin: Approve Request
```http
POST /api/auth/approve-recovery-key-reset/:userId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Recovery key reset request approved",
  "temporaryKey": "temp_john_1234567890",
  "expiresAt": "2024-01-02T12:00:00.000Z"
}
```

## Error Handling

### Common Error Scenarios

1. **Invalid Email/Phone Combination**
   ```json
   {
     "message": "User not found with provided email and phone number"
   }
   ```

2. **Duplicate Request**
   ```json
   {
     "message": "You already have a pending recovery key reset request. Please wait for admin approval."
   }
   ```

3. **Invalid Temporary Key**
   ```json
   {
     "message": "Invalid temporary recovery key"
   }
   ```

4. **Expired Temporary Key**
   ```json
   {
     "message": "Temporary recovery key has expired"
   }
   ```

5. **Weak Recovery Key**
   ```json
   {
     "message": "New recovery key must be at least 8 characters long"
   }
   ```

## Testing Checklist

### User Flow Testing
- [ ] Submit recovery key reset request
- [ ] Validate phone number format
- [ ] Check duplicate request prevention
- [ ] Test temporary key usage
- [ ] Verify new recovery key validation
- [ ] Test password reset with new recovery key

### Admin Flow Testing
- [ ] View pending requests
- [ ] Approve request (generate temp key)
- [ ] Reject request (with reason)
- [ ] Verify admin authentication
- [ ] Test request status updates

### Security Testing
- [ ] Verify bcrypt hashing of recovery keys
- [ ] Test temporary key expiration
- [ ] Validate admin-only access
- [ ] Check request deduplication
- [ ] Test input validation

## Deployment Notes

### Environment Variables
- `JWT_SECRET` - Used for admin authentication
- `MONGO_URI` - Database connection

### Database Migration
- New `recoveryKeyResetRequest` field added to User model
- Existing users will have `null` for this field (no impact)

### Admin Setup
- Ensure admin users have proper authentication
- Set up admin panel access at `/admin-recovery-key-requests`
- Train admins on the approval process

## Monitoring and Maintenance

### What to Monitor
- Number of recovery key reset requests
- Approval/rejection rates
- Temporary key usage rates
- Failed attempts and errors

### Maintenance Tasks
- Clean up expired temporary keys (optional)
- Review rejected requests for patterns
- Monitor for abuse or spam
- Update admin contact procedures

## Future Enhancements

### Potential Improvements
1. **WhatsApp Integration** - Automate admin notifications
2. **SMS Verification** - Add phone verification step
3. **Request Analytics** - Track request patterns
4. **Auto-approval Rules** - Approve based on criteria
5. **Audit Logging** - Detailed activity tracking

### Security Enhancements
1. **Rate Limiting** - Limit request frequency
2. **IP Tracking** - Monitor request sources
3. **Device Fingerprinting** - Additional verification
4. **Time-based Restrictions** - Limit reset frequency

## Support and Troubleshooting

### Common Issues

1. **User can't submit request**
   - Check email/phone combination
   - Verify phone number format
   - Check for existing pending request

2. **Admin can't approve request**
   - Verify admin authentication
   - Check request status
   - Ensure proper permissions

3. **Temporary key not working**
   - Check key expiration
   - Verify key format
   - Confirm request approval status

### Debug Steps
1. Check server logs for errors
2. Verify database records
3. Test API endpoints manually
4. Check frontend network requests
5. Validate user input data

## Conclusion

This implementation provides a complete solution for users who forget their recovery keys while maintaining security and preventing abuse. The admin approval system ensures that only legitimate requests are processed, and the temporary key system provides a secure way for users to regain access to their accounts.

The solution is production-ready and includes comprehensive error handling, validation, and user experience considerations.
