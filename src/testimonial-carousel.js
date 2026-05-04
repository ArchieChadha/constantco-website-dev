/**
 * Auto-advancing testimonial carousel. Pauses on hover/focus; disabled when prefers-reduced-motion.
 */
(function () {
    function parseInterval(root) {
        const raw = root.getAttribute('data-carousel-interval');
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(n) && n >= 2000 ? n : 5500;
    }

    function initCarousel(root) {
        const track = root.querySelector('.testimonial-carousel-track');
        const slides = root.querySelectorAll('.testimonial-slide');
        const prevBtn = root.querySelector('[data-carousel-prev]');
        const nextBtn = root.querySelector('[data-carousel-next]');
        const dots = root.querySelectorAll('[data-carousel-dot]');

        if (!track || slides.length === 0) return;

        const reduced =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduced) {
            root.classList.add('testimonial-carousel--reduced');
            slides.forEach((s) => {
                s.removeAttribute('aria-hidden');
                s.classList.add('is-active');
            });
            return;
        }

        let index = 0;
        let timerId = null;
        const intervalMs = parseInterval(root);

        function setIndex(next) {
            const n = slides.length;
            index = ((next % n) + n) % n;
            track.style.transform = `translateX(-${index * 100}%)`;
            slides.forEach((slide, i) => {
                const active = i === index;
                slide.classList.toggle('is-active', active);
                slide.setAttribute('aria-hidden', active ? 'false' : 'true');
            });
            dots.forEach((dot, i) => {
                dot.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
        }

        function schedule() {
            clearTimeout(timerId);
            timerId = window.setTimeout(() => {
                setIndex(index + 1);
                schedule();
            }, intervalMs);
        }

        function pause() {
            clearTimeout(timerId);
            timerId = null;
            root.classList.add('testimonial-carousel--paused');
        }

        function resume() {
            if (root.classList.contains('testimonial-carousel--reduced')) return;
            root.classList.remove('testimonial-carousel--paused');
            schedule();
        }

        setIndex(0);
        schedule();

        root.addEventListener('mouseenter', pause);
        root.addEventListener('mouseleave', resume);
        root.addEventListener('focusin', pause);
        root.addEventListener('focusout', (e) => {
            if (!root.contains(e.relatedTarget)) resume();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) pause();
            else resume();
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                setIndex(index - 1);
                pause();
                resume();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                setIndex(index + 1);
                pause();
                resume();
            });
        }
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                setIndex(i);
                pause();
                resume();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-testimonial-carousel]').forEach(initCarousel);
    });
})();
