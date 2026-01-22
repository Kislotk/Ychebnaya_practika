<?php
/**
 * Plugin Name: Отзывы об отеле
 * Description: Случайные отзывы, меняются каждые 10 секунд
 */

// 1. Создаем тип записи "Отзывы"
add_action('init', function() {
    register_post_type('hotel_review', [
        'labels' => [
            'name' => 'Отзывы',
            'add_new' => 'Добавить отзыв'
        ],
        'public' => true,
        'menu_icon' => 'dashicons-star-filled',
        'supports' => ['title', 'editor']
    ]);
});

// 2. Добавляем поля для отзыва
add_action('add_meta_boxes', function() {
    add_meta_box('review_details', 'Детали проживания', function($post) {
        $check_in = get_post_meta($post->ID, 'check_in', true);
        $guests = get_post_meta($post->ID, 'guests', true);
        $purpose = get_post_meta($post->ID, 'purpose', true);
        ?>
        <div style="padding: 10px;">
            <p><strong>Дата заезда:</strong><br>
            <input type="date" name="check_in" value="<?= esc_attr($check_in) ?>" style="width:100%; padding:5px;"></p>
            
            <p><strong>Количество гостей:</strong><br>
            <input type="number" name="guests" value="<?= esc_attr($guests) ?>" min="1" max="10" style="width:100%; padding:5px;"></p>
            
            <p><strong>Цель поездки:</strong><br>
            <select name="purpose" style="width:100%; padding:5px;">
                <option value="business" <?= $purpose == 'business' ? 'selected' : '' ?>>Бизнес</option>
                <option value="tourism" <?= $purpose == 'tourism' ? 'selected' : '' ?>>Туризм</option>
            </select></p>
        </div>
        <?php
    }, 'hotel_review', 'normal', 'high');
});

// 3. Сохраняем поля
add_action('save_post', function($post_id) {
    if (isset($_POST['check_in'])) {
        update_post_meta($post_id, 'check_in', sanitize_text_field($_POST['check_in']));
    }
    if (isset($_POST['guests'])) {
        update_post_meta($post_id, 'guests', intval($_POST['guests']));
    }
    if (isset($_POST['purpose'])) {
        update_post_meta($post_id, 'purpose', sanitize_text_field($_POST['purpose']));
    }
});

// 4. Показываем отзывы на сайте (с автосменой каждые 10 секунд)
add_action('wp_footer', function() {
    // Получаем все отзывы
    $reviews = get_posts([
        'post_type' => 'hotel_review',
        'numberposts' => -1,
        'post_status' => 'publish'
    ]);
    
    if (empty($reviews)) {
        return;
    }
    
    // Подготавливаем данные для JavaScript
    $reviews_data = [];
    foreach ($reviews as $review) {
        $check_in = get_post_meta($review->ID, 'check_in', true);
        $guests = get_post_meta($review->ID, 'guests', true);
        $purpose = get_post_meta($review->ID, 'purpose', true);
        
        $reviews_data[] = [
            'id' => $review->ID,
            'title' => esc_js($review->post_title),
            'content' => esc_js(wp_trim_words($review->post_content, 25, '...')),
            'check_in' => esc_js($check_in ? date('d.m.Y', strtotime($check_in)) : ''),
            'guests' => esc_js($guests),
            'purpose' => esc_js($purpose == 'business' ? 'Бизнес' : 'Туризм')
        ];
    }
    ?>
    
    <!-- Контейнер для отзыва -->
    <div id="hotel-review-banner" style="display:none; position:fixed; bottom:20px; right:20px; width:350px; background:white; padding:20px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.2); border-left:5px solid #ff9900; z-index:999999; font-family:Arial, sans-serif;">
        <button id="close-review" style="position:absolute; top:10px; right:10px; background:#ff4444; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer; font-size:16px; line-height:1;">×</button>
        
        <div style="margin-bottom:15px;">
            <div style="color:#ff9900; font-size:24px; float:left; margin-right:10px;">"</div>
            <div id="review-content" style="font-style:italic; color:#333; line-height:1.4;"></div>
            <div style="color:#ff9900; font-size:24px; float:right; margin-left:10px;">"</div>
            <div style="clear:both;"></div>
        </div>
        
        <div id="review-meta" style="border-top:1px solid #eee; padding-top:10px; font-size:14px; color:#666;">
            <div><strong id="review-author"></strong></div>
            <div id="review-details"></div>
        </div>
    </div>
    
    <!-- JavaScript для смены отзывов -->
    <script type="text/javascript">
    (function() {
        var reviews = <?php echo json_encode($reviews_data); ?>;
        var currentIndex = 0;
        var banner = document.getElementById('hotel-review-banner');
        
        if (reviews.length === 0) return;
        
        // Функция показа отзыва
        function showReview(index) {
            var review = reviews[index];
            
            document.getElementById('review-content').textContent = review.content;
            document.getElementById('review-author').textContent = review.title;
            
            var details = [];
            if (review.purpose) details.push(review.purpose);
            if (review.guests) details.push(review.guests + ' гостей');
            if (review.check_in) details.push(review.check_in);
            
            document.getElementById('review-details').textContent = details.join(' • ');
            banner.style.display = 'block';
        }
        
        // Функция смены отзыва
        function changeReview() {
            currentIndex = (currentIndex + 1) % reviews.length;
            showReview(currentIndex);
        }
        
        // Показываем первый отзыв
        setTimeout(function() {
            currentIndex = Math.floor(Math.random() * reviews.length);
            showReview(currentIndex);
            
            // Меняем каждые 10 секунд
            setInterval(changeReview, 10000);
        }, 3000);
        
        // Закрытие баннера
        document.getElementById('close-review').addEventListener('click', function() {
            banner.style.display = 'none';
        });
        
        // Закрытие при клике вне баннера
        document.addEventListener('click', function(e) {
            if (!banner.contains(e.target) && banner.style.display === 'block') {
                banner.style.display = 'none';
            }
        });
        
    })();
    </script>
    
    <style>
    #hotel-review-banner {
        animation: slideIn 0.5s ease-out;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    #close-review:hover {
        background: #cc0000 !important;
        transform: scale(1.1);
        transition: all 0.3s ease;
    }
    
    @media (max-width: 768px) {
        #hotel-review-banner {
            width: calc(100% - 40px);
            right: 20px;
            left: 20px;
            bottom: 10px;
        }
    }
    </style>
    <?php
});