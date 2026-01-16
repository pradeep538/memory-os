import 'package:flutter/material.dart';

/// Connection Status Banner
/// Shows offline/syncing status
class ConnectionStatusBanner extends StatelessWidget {
  final bool isConnected;
  final int pendingMessages;
  final bool isSyncing;
  
  const ConnectionStatusBanner({
    Key? key,
    required this.isConnected,
    this.pendingMessages = 0,
    this.isSyncing = false,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    if (isConnected && pendingMessages == 0) {
      return const SizedBox.shrink();
    }
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        border: Border(
          bottom: BorderSide(
            color: _getBorderColor(),
            width: 1,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildIcon(),
          const SizedBox(width: 8),
          Text(
            _getMessage(),
            style: TextStyle(
              color: _getTextColor(),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildIcon() {
    if (isSyncing) {
      return SizedBox(
        width: 14,
        height: 14,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(_getTextColor()),
        ),
      );
    }
    
    return Icon(
      isConnected ? Icons.cloud_done : Icons.cloud_off,
      color: _getTextColor(),
      size: 16,
    );
  }
  
  String _getMessage() {
    if (isSyncing) {
      return 'Syncing $pendingMessages messages...';
    }
    
    if (!isConnected) {
      if (pendingMessages > 0) {
        return 'Offline - $pendingMessages messages queued';
      }
      return 'Offline - Messages will sync when online';
    }
    
    if (pendingMessages > 0) {
      return '$pendingMessages messages pending';
    }
    
    return 'Online';
  }
  
  Color _getBackgroundColor() {
    if (!isConnected) {
      return const Color(0xFFEF4444).withOpacity(0.1); // Red
    }
    if (pendingMessages > 0) {
      return const Color(0xFFF59E0B).withOpacity(0.1); // Amber
    }
    return const Color(0xFF22C55E).withOpacity(0.1); // Green
  }
  
  Color _getBorderColor() {
    if (!isConnected) return const Color(0xFFEF4444).withOpacity(0.3);
    if (pendingMessages > 0) return const Color(0xFFF59E0B).withOpacity(0.3);
    return const Color(0xFF22C55E).withOpacity(0.3);
  }
  
  Color _getTextColor() {
    if (!isConnected) return const Color(0xFFEF4444);
    if (pendingMessages > 0) return const Color(0xFFF59E0B);
    return const Color(0xFF22C55E);
  }
}
