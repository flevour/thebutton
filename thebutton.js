var r = {};
r.debug = function(){
  r.debug.history = r.debug.history || [];   // store logs to an array for reference
  r.debug.history.push(arguments);
  if(console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};
r.config = {};

$.request = function() {
    r.debug(arguments);
};
r.config.thebutton_websocket = true;
r.WebSocket = function(){
    var that = this;
    return {
        on: function(conf) {
            that.conf = conf;
        },
        trigger: function(name, event) {
            that.conf[name](event);
        },
        start: function() {},
    }
}

r.thebutton = {
    _setTimer: function(e) {
        var t = "00000",
        n = (e > 0 ? e : 0).toString(),
        i = t.substring(0, t.length - n.length) + n;
        for (var s = 0; s < 4; s++) r.thebutton._timerTextNodes[s].nodeValue = i[s];
            e % 100 === 0 && r.thebutton._drawPie(e, 6e4)
    },
    _countdown: function() {
        r.thebutton._setTimer(r.thebutton._msLeft), r.thebutton._msLeft = Math.max(0, r.thebutton._msLeft - 10)
    },
    init: function() {
        if ($("#thebutton").length === 0) return;

        this._chart = new google.visualization.PieChart($(".thebutton-pie").get(0)),
        this._msLeft = 0,
        this._msgSecondsLeft = 0,
        this._tickTime = "",
        this._tickMac = "",
        this._lastMsLeft = Infinity,
        this._timerTextNodes = [
            $("#thebutton-s-10s").get(0).childNodes[0],
            $("#thebutton-s-1s").get(0).childNodes[0],
            $("#thebutton-s-100ms").get(0).childNodes[0],
            $("#thebutton-s-10ms").get(0).childNodes[0]
        ],
        r.debug("in r.thebutton.init()"),
        this._started = !1;
        r.config.thebutton_websocket ? (r.debug("got thebutton_websocket"), this._websocket = new r.WebSocket(r.config.thebutton_websocket), this._websocket.on({
            "message:expired": this._onExpired,
            "message:not_started": this._onNotStarted,
            "message:just_expired": this._onJustExpired,
            "message:ticking": this._onTicking
        }, this), this._websocket.start()) : r.debug("didn't get thebutton_websocket");
        var e = $("#thebutton").parent();
        e.on("click", function(e) {
            var t = $(this);
            t.is(".active.locked") && (t.addClass("unlocking").removeClass("locked"), setTimeout(function() {
                t.removeClass("unlocking").addClass("unlocked")
            }, 300))
        }), $("#thebutton").on("click", function(t) {
            t.preventDefault(), t.stopPropagation();
            if (e.hasClass("pressed")) return;
            r.thebutton._countdownInterval = window.clearInterval(r.thebutton._countdownInterval), r.thebutton._setTimer(6e4);
            var n = {
                seconds: $("#thebutton-timer").val(),
                prev_seconds: r.thebutton._msgSecondsLeft,
                tick_time: r.thebutton._tickTime,
                tick_mac: r.thebutton._tickMac
            };
            $.request("press_button", n, function(e) {
                console.log(e)
            }), e.addClass("pressed").removeClass("unlocked"), r.thebutton.pulse()
        })
    },
    _drawPie: function(e, t) {
        var n = t - e,
        r = google.visualization.arrayToDataTable([
            ["", ""],
            ["gone", n],
            ["remaining", e]
            ]),
        i = {
            chartArea: {
                top: 0,
                left: 0,
                width: 70,
                height: 70
            },
            pieSliceBorderColor: "transparent",
            legend: "none",
            pieSliceText: "none",
            slices: {
                0: {
                    color: "#C8C8C8"
                },
                1: {
                    color: "#4A4A4A"
                }
            },
            enableInteractivity: !1
        };
        this._chart.draw(r, i)
    },
    _onExpired: function(e) {
        var t = e.seconds_elapsed;
        r.debug("timer expired " + t + " ago"), $(".thebutton-wrap").removeClass("active").addClass("complete"), r.thebutton._countdownInterval = window.clearInterval(r.thebutton._countdownInterval), r.thebutton._setTimer(0)
    },
    _onNotStarted: function(e) {
        r.debug("timer hasn't started")
    },
    _onJustExpired: function(e) {
        r.debug("timer just expired"), $(".thebutton-wrap").removeClass("active").addClass("complete"), $el = $("#thebutton").parent(), $el.removeClass("unlocked locked logged-out pressed too-new not-active").addClass("denied has-expired")
    },
    _onTicking: function(e) {
        if (!r.thebutton._started) {
            var t = $("#thebutton").parent();
            t.is(".not-active, .locked") && t.removeClass("denied not-active").addClass("active locked"), r.thebutton._started = !0, r.thebutton._countdownInterval = window.setInterval(r.thebutton._countdown, 10)
        }
        var n = e.seconds_left;
        this._tickTime = e.now_str, this._msgSecondsLeft = n, this._tickMac = e.tick_mac;
        var i = e.participants_text,
        s = n * 1e3;
        s > r.thebutton._lastMsLeft && this.pulse2(), r.thebutton._lastMsLeft = s, r.thebutton._msLeft = n * 1e3, r.thebutton._countdownInterval || (this._countdownInterval = window.setInterval(r.thebutton._countdown, 10)), r.debug(n + " seconds remaining"), r.debug(i + " users have pushed the button"), $("#thebutton-timer").val(parseInt(e.seconds_left, 10)), $(".thebutton-participants").text(e.participants_text)
    },
    pulse: function() {
        $els = $(".thebutton-container, .thebutton-pie-container"), $els.removeClass("pulse pulse2"), setTimeout(function() {
            $els.addClass("pulse")
        }, 1)
    },
    pulse2: function() {
        var e = $(".thebutton-pie-container"),
        t = this;
        e.removeClass("pulse pulse2"), setTimeout(function() {
            e.addClass("pulse2")
        }, 1)
    },
    _testState: function(e, t) {
        t = t || 6e4, $el = $("#thebutton").parent();
        var n = "denied logged-out too-new has-expired pressed locked unlocked";
        $el.removeClass(n), r.thebutton._msLeft = t, r.thebutton.pulse();
        switch (e) {
            case "logged-out":
            $el.addClass("denied logged-out");
            break;
            case "too-new":
            $el.addClass("denied too-new");
            break;
            case "has-expired":
            $el.addClass("denied has-expired");
            break;
            case "pressed":
            $el.addClass("pressed");
            break;
            case "unlocked":
            $el.addClass("unlocked");
            break;
            case "locked":
            default:
            $el.addClass("locked")
        }
    }
};
$(function() {
    google.load('visualization', '1', {'packages': ['corechart'], callback: function() {
        r.thebutton.init();
        $('body').trigger('thebutton:init');
    }});
});
