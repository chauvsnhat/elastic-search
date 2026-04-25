# BÁO CÁO KẾT QUẢ THỰC HIỆN DỰ ÁN TÌM KIẾM VỚI ELASTICSEARCH

Dự án này triển khai hệ thống tìm kiếm Full-Text Search hiệu năng cao kết hợp cơ chế Type-ahead bằng Elasticsearch, Backend Node.js/Express và Web UI bằng React.

## 1. Backend & Database 
**✅ Trạng thái: Hoàn thành tốt**
- **Cấu hình Elasticsearch:** Hệ thống đã thiết lập thông qua Docker Compose để khởi chạy Elasticsearch (phiên bản 8.12.2) và Kibana. Cấu hình định dạng node đơn (`discovery.type=single-node`) và thiết lập giới hạn bộ nhớ RAM (`-Xms512m -Xmx512m`) tối ưu môi trường dev.
- **Cơ chế lập chỉ mục (Indexing):** Lập chỉ mục chuẩn xác cho index `products` với:
  - Trường `product_name` với kiểu dữ liệu `search_as_you_type` để phục vụ tối ưu cho thao tác autocomplete.
  - Các trường `description` dùng kiểu `text` cho Full-text search, `brand` & `category` áp dụng `keyword` phù hợp lọc dữ liệu.
  - Tự động Ingest bằng Bulk API hơn 500 bản ghi mẫu để test hiệu suất thực tế.

## 2. Web UI (Demo chức năng FTS)
**✅ Trạng thái: Hoàn thành xuất sắc (Thiết kế Premium)**
- **Thiết kế chuyên nghiệp:** Ứng dụng Glassmorphism hiện đại cho Frontend với React/Vite, kết hợp các hiệu ứng Gradient, hoạt ảnh (`fadeIn`, `pulse`), dark theme sang trọng.
- **Khung Search:** Box search được bo góc nổi bật, trải nghiệm focus ấn tượng kết hợp với phản hồi thời gian thực.
- **Kết quả hiển thị:** Layout dạng list card dễ nhìn, kết nối linh hoạt các trường Tên sản phẩm, Giá cả, Mô tả và phân loại Category/Brand.
- **Tính năng Highlight Text:** Được áp dụng mạnh mẽ trả chiều thẳng từ Elasticsearch qua tính năng `highlight` bọc bằng thẻ `<mark>`. Render kết quả an toàn bằng `dangerouslySetInnerHTML`.

## 3. Tính năng Type-ahead (Gợi ý phân mảnh)
**✅ Trạng thái: Hoàn thành & tối ưu luồng Web**
- **Suggestion Board:** Giao diện tự động trải rộng các đề xuất sản phẩm dựa trên input gõ phím của người dùng.
- **Tối ưu hóa Response:**
  - **Frontend:** Implement giải thuật `Debouncing` (Hook tuỳ chỉnh 300ms) để triệt tiêu spam API tới server theo mỗi ký tự gõ.
  - **Backend:** Xử lí search suggest với truy vấn phân mảnh cực nhanh `multi_match` trên `bool_prefix` trải qua 3 layers của token `_2gram`, `_3gram` với limit size = 7 items siêu mượt mà.

## 4. Tối ưu hóa (Kiểm thử Elasticsearch nguyên bản - No Cache)
**✅ Trạng thái: Passed**
- Cấu hình server hoàn toàn cô lập mọi tầng cache của browser và backend request để test đúng hiệu suất real-time:
  - **Backend Layer:** Set global Middleware bắt buộc override res header: `'Cache-Control': 'no-cache, no-store, must-revalidate'`, `'Pragma': 'no-cache'`, `'Expires': '0'`.
  - **FE Client Layer:** Request Fetch api force strict rule `cache: 'no-store'`.
- Hệ thống UI show thẳng số liệu trích xuất từ ES như ms execution (`took`), tổng hits, minh hoạ chi tiết sức mạnh của ES trong mili-giây.

---
**Hướng dẫn sử dụng nhanh:**
1. Chạy Elasticsearch + Kibana: `docker-compose up -d`
2. Cài đặt và khởi chạy Backend (Tạo dữ liệu tự động): 
   - Đi tới `backend` thư mục -> `npm install` -> `node setupIndices.js` -> `npm start` (Chạy ở port 3000)
3. Chạy Frontend UI:
   - Đi tới thư mục `frontend` -> `npm install` -> `npm run dev`
