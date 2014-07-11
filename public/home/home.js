$(function() {
    function getScrollBarWidth() {
        var t1 = $('<div></div>').css({
            overflow : 'auto',
            height : '50px'
        }).append($('<div></div>').css('height', '100px'));
        var cw = t1.appendTo('body')[0].clientWidth;
        var ow = t1[0].offsetWidth;
        t1.remove();
        return ow - cw;
    }
    var content = $('#content').css('margin-right', -getScrollBarWidth()).css('overflow', 'auto').scroll(repositionScroll);
    function resize() {
        var width = $(window).width();
        var height = $(window).height();
        $('.full-height').each(function() {
            var $this = $(this);
            var padding = $this.outerHeight(true) - $this.height();
            $this.css('height', height + 'px');
        });
        repositionScroll();
    }
    function repositionScroll() {
        var scrollBar = $('#vertical-scroll-bar');
        var handle = $('.handle', scrollBar);
        var sh = content.prop('scrollHeight');
        var st = content.prop('scrollTop');
        var ch = content.prop('clientHeight');
        var hh = ch * ch / sh;
        var ht = st * ch / sh;
        handle.css({
            top : ht + 'px',
            height : hh + 'px',
            display : ch == sh ? 'none' : 'block'
        });
    }
    resize();
    var SHIM = $('<div class="shim"></div>').on('selectstart', function(e) {
        e.preventDefault();
    });
    $('#vertical-scroll-bar .handle').on('mousedown touchstart', function(start) {
        var top = content.prop('scrollTop');
        SHIM.appendTo('body');
        function scrollMove(move) {
            var sh = content.prop('scrollHeight');
            var ch = content.prop('clientHeight');
            var st = Math.max(0, Math.min(sh - ch, top + (move.pageY - start.pageY) * sh / ch));
            content.prop('scrollTop', st);
        }
        var el = $(window).on('mousemove touchmove', scrollMove).on('mouseup touchend', function() {
            SHIM.detach();
            el.off('mousemove touchmove', scrollMove);
        });
        start.preventDefault();
    }).on('selectstart', function(e) {
        e.preventDefault()
    });
});