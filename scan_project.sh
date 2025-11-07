#!/bin/bash

# Tạo tên file output với timestamp
OUTPUT_FILE="project_code_report_$(date +%Y%m%d_%H%M%S).txt"

echo "🔍 Đang tạo báo cáo code project..."
echo "File output: $OUTPUT_FILE"

{
echo "=== BÁO CÁO CODE PROJECT CHAT REALTIME ==="
echo "Generated: $(date)"
echo "=========================================="

echo -e "\n📁 CẤU TRÚC PROJECT:"
echo "=========================================="
tree -I 'node_modules|.git|.*' -a

echo -e "\n✅ HOÀN THÀNH"

} > "$OUTPUT_FILE"

echo "✅ Đã tạo file báo cáo: $OUTPUT_FILE"