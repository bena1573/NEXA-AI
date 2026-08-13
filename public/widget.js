/**
 * NEXA AI embeddable chat launcher.
 *
 * Usage:
 *   <script src="https://app.example.com/widget.js" data-widget-id="YOUR_WIDGET_ID" defer></script>
 *
 * The conversation itself runs inside an iframe so the host page's CSS and
 * scripts can never reach it (and vice versa).
 */
(function () {
    var script = document.currentScript
        || document.querySelector('script[data-widget-id]');
    if (!script) return;

    var widgetId = script.getAttribute('data-widget-id');
    if (!widgetId) return;

    var origin = new URL(script.src, window.location.href).origin;
    var accent = script.getAttribute('data-accent') || '#14b8a6';
    var label = script.getAttribute('data-label') || 'Chat with us';
    var open = false;

    var frame = document.createElement('iframe');
    frame.src = origin + '/widget/' + encodeURIComponent(widgetId);
    frame.title = label;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = [
        'position:fixed', 'bottom:88px', 'right:20px', 'width:380px', 'height:min(560px, 70vh)',
        'max-width:calc(100vw - 40px)', 'border:0', 'border-radius:16px', 'display:none',
        'box-shadow:0 20px 50px rgba(2,6,23,.45)', 'z-index:2147483000', 'background:#0b1220',
    ].join(';');

    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', label);
    button.textContent = label;
    button.style.cssText = [
        'position:fixed', 'bottom:20px', 'right:20px', 'padding:12px 18px', 'border:0',
        'border-radius:999px', 'background:' + accent, 'color:#04201c', 'font:600 14px/1.2 system-ui,sans-serif',
        'cursor:pointer', 'box-shadow:0 12px 30px rgba(2,6,23,.35)', 'z-index:2147483001',
    ].join(';');

    button.addEventListener('click', function () {
        open = !open;
        frame.style.display = open ? 'block' : 'none';
        frame.setAttribute('aria-hidden', open ? 'false' : 'true');
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        button.textContent = open ? 'Close chat' : label;
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && open) button.click();
    });

    document.body.appendChild(frame);
    document.body.appendChild(button);
})();
