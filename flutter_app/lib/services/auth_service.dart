import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart';

/// Firebase Authentication Service
/// Handles Google SSO and Phone authentication
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  /// Get current user
  User? get currentUser => _auth.currentUser;

  /// Auth state changes stream
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Get current user ID
  String? get userId => _auth.currentUser?.uid;

  /// Get current user email
  String? get userEmail => _auth.currentUser?.email;

  /// Get current user display name
  String? get userDisplayName => _auth.currentUser?.displayName;

  /// Get ID token for API calls
  Future<String?> getIdToken() async {
    return await _auth.currentUser?.getIdToken();
  }

  /// Sign in with Google
  Future<UserCredential?> signInWithGoogle() async {
    try {
      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        // User canceled the sign-in
        return null;
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      return await _auth.signInWithCredential(credential);
    } catch (e) {
      debugPrint('Error signing in with Google: $e');
      rethrow;
    }
  }

  /// Send SMS verification code to phone number
  /// Returns verification ID for code confirmation
  Future<String> verifyPhoneNumber({
    required String phoneNumber,
    required Function(String verificationId) onCodeSent,
    required Function(String error) onError,
    Function(PhoneAuthCredential credential)? onAutoVerify,
  }) async {
    String? verificationId;

    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (PhoneAuthCredential credential) async {
        // Auto-verification (Android only)
        if (onAutoVerify != null) {
          onAutoVerify(credential);
        } else {
          await _auth.signInWithCredential(credential);
        }
      },
      verificationFailed: (FirebaseAuthException e) {
        debugPrint('Phone verification failed: ${e.message}');
        onError(e.message ?? 'Verification failed');
      },
      codeSent: (String verId, int? resendToken) {
        verificationId = verId;
        onCodeSent(verId);
      },
      codeAutoRetrievalTimeout: (String verId) {
        verificationId = verId;
      },
    );

    return verificationId ?? '';
  }

  /// Sign in with phone number using verification code
  Future<UserCredential?> signInWithPhoneCode({
    required String verificationId,
    required String smsCode,
  }) async {
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: smsCode,
      );

      return await _auth.signInWithCredential(credential);
    } catch (e) {
      debugPrint('Error signing in with phone: $e');
      rethrow;
    }
  }

  /// Sign out from all providers
  Future<void> signOut() async {
    try {
      // Try to sign out of Google first, but don't let it block Firebase signout
      try {
        await _googleSignIn.signOut();
      } catch (e) {
        debugPrint('Google sign out error (ignoring): $e');
      }

      // Always sign out of Firebase
      await _auth.signOut();
    } catch (e) {
      debugPrint('Error signing out: $e');
      rethrow;
    }
  }

  /// Delete user account
  Future<void> deleteAccount() async {
    try {
      await _auth.currentUser?.delete();
    } catch (e) {
      debugPrint('Error deleting account: $e');
      rethrow;
    }
  }

  /// Reload user data
  Future<void> reloadUser() async {
    await _auth.currentUser?.reload();
  }

  /// Check if user is signed in
  bool get isSignedIn => _auth.currentUser != null;

  /// Sign in anonymously (Guest Mode)
  Future<UserCredential> signInAnonymously() async {
    try {
      return await _auth.signInAnonymously();
    } catch (e) {
      debugPrint('Error signing in anonymously: $e');
      rethrow;
    }
  }

  /// Link phone number to existing account
  Future<UserCredential?> linkPhoneNumber({
    required String verificationId,
    required String smsCode,
  }) async {
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: smsCode,
      );

      return await _auth.currentUser?.linkWithCredential(credential);
    } catch (e) {
      debugPrint('Error linking phone number: $e');
      rethrow;
    }
  }
}
