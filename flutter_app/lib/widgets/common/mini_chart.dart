import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/app_colors.dart';

/// Mini bar chart widget
class MiniBarChart extends StatelessWidget {
  final List<double> data;
  final double height;
  final Color? barColor;
  final Color? backgroundColor;

  const MiniBarChart({
    super.key,
    required this.data,
    this.height = 40,
    this.barColor,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return SizedBox(height: height);
    }

    final maxValue = data.reduce((a, b) => a > b ? a : b);
    final effectiveMax = maxValue > 0 ? maxValue : 1;

    return SizedBox(
      height: height,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: effectiveMax * 1.1,
          minY: 0,
          barTouchData: BarTouchData(enabled: false),
          titlesData: const FlTitlesData(show: false),
          borderData: FlBorderData(show: false),
          gridData: const FlGridData(show: false),
          barGroups: data.asMap().entries.map((entry) {
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: entry.value,
                  color: barColor ?? AppColors.primary,
                  width: 8,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(4),
                  ),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: effectiveMax * 1.1,
                    color: backgroundColor ?? AppColors.borderLight,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
        duration: const Duration(milliseconds: 250),
      ),
    );
  }
}

/// Mini line chart widget
class MiniLineChart extends StatelessWidget {
  final List<double> data;
  final double height;
  final Color? lineColor;
  final bool showArea;

  const MiniLineChart({
    super.key,
    required this.data,
    this.height = 40,
    this.lineColor,
    this.showArea = true,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return SizedBox(height: height);
    }

    final color = lineColor ?? AppColors.primary;
    final maxValue = data.reduce((a, b) => a > b ? a : b);
    final minValue = data.reduce((a, b) => a < b ? a : b);
    final effectiveMax = maxValue > minValue ? maxValue : minValue + 1;

    return SizedBox(
      height: height,
      child: LineChart(
        LineChartData(
          lineTouchData: const LineTouchData(enabled: false),
          gridData: const FlGridData(show: false),
          titlesData: const FlTitlesData(show: false),
          borderData: FlBorderData(show: false),
          minX: 0,
          maxX: (data.length - 1).toDouble(),
          minY: minValue * 0.9,
          maxY: effectiveMax * 1.1,
          lineBarsData: [
            LineChartBarData(
              spots: data.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), entry.value);
              }).toList(),
              isCurved: true,
              color: color,
              barWidth: 2,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: false),
              belowBarData: showArea
                  ? BarAreaData(
                      show: true,
                      color: color.withAlpha(38),
                    )
                  : BarAreaData(show: false),
            ),
          ],
        ),
        duration: const Duration(milliseconds: 250),
      ),
    );
  }
}
