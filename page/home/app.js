angular.module('lostwood')
    .controller('HomeController', [
        '$scope',
        function ($scope) {
            'use strict';

            var lw = {
                properties: {},
                propertyAdd: function (propertyName, propertyDelta, isMinus) {
                    var sgn = isMinus ? -1 : 1;
                    if (angular.isNumber(propertyDelta)) {
                        lw.properties[propertyName].amount += sgn * propertyDelta;
                    } else {
                        if (lw.properties[propertyName] === undefined) {
                            lw.properties[propertyName] = angular.extend({
                                amount: 0,
                                head: propertyName,
                                msg: '物品: ' + propertyName + '.'
                            }, propertyDelta);
                            lw.properties[propertyName].amount *= sgn;
                            angular.forEach(lw.actions, function (action) {
                                if (!action.visible) {
                                    lw.actionUpdate(action);
                                }
                            });
                        } else {
                            var amountOrigin = lw.properties[propertyName].amount || 0;
                            angular.extend(lw.properties[propertyName], propertyDelta);
                            lw.properties[propertyName].amount *= sgn;
                            lw.properties[propertyName].amount += amountOrigin;
                        }
                    }
                },
                actions: {},
                actionCount: 0,
                actionInit: function (action) {
                    action.onlyid = lw.actionCount;
                    angular.forEach(action.fee, function (propertyDelta, propertyName) {
                        if (angular.isNumber(propertyDelta)) {
                            action.fee[propertyName] = {amount: propertyDelta};
                        }
                    });
                    angular.forEach(action.pay, function (propertyDelta, propertyName) {
                        if (angular.isNumber(propertyDelta)) {
                            action.fee[propertyName] = {amount: propertyDelta};
                        }
                    });
                    action = angular.extend({
                        disabled: false
                    }, action);
                    lw.actionCount++;
                    return action;
                },
                actionUpdate: function (action) {
                    action.visible = true;
                    angular.forEach(action.fee, function (propertyDelta, propertyName) {
                        if (lw.properties[propertyName] === undefined) {
                            action.visible = false;
                        }
                    });
                    return action;
                },
                actionAdd: function (actionName, action) {
                    lw.actionInit(action);
                    lw.actionUpdate(action);
                    lw.actions[actionName] = action;
                },
                actionClick: function (action) {
                    var lacks = [];
                    angular.forEach(action.fee, function (propertyDelta, propertyName) {
                        if (lw.properties[propertyName].amount < propertyDelta.amount) {
                            lacks.push(lw.properties[propertyName].head + '缺少 ' + (propertyDelta.amount - lw.properties[propertyName].amount));
                        }
                    });
                    if (lacks.length) {
                        lw.alert.show('warning', '材料不足', lacks.join(', '));
                        return false;
                    }
                    angular.forEach(action.fee, function (propertyDelta, propertyName) {
                        lw.propertyAdd(propertyName, propertyDelta, true);
                    });
                    angular.forEach(action.pay, function (propertyDelta, propertyName) {
                        lw.propertyAdd(propertyName, propertyDelta);
                    });
                    if (angular.isFunction(action.fn)) {
                        return action.fn(action);
                    } else {
                        return true;
                    }
                },
                events: {},
                eventRegister: function (eventName, event) {
                    if (lw.playing) {
                        lw.eventRun(event);
                    }
                    lw.events[eventName] = event;
                },
                eventRemove: function (eventName) {
                    var event = lw.events[eventName];
                    if (event.timer !== undefined) {
                        clearInterval(event.timer);
                        event.timer = undefined;
                    }
                    delete lw.events[eventName];
                },
                eventRun: function (event) {
                    if (event.timer !== undefined) {
                        return;
                    }
                    event.timer = setInterval(function () {
                        $scope.$apply(event.fn);
                    }, event.interval * 1000);
                },
                dead: false,
                playing: false,
                die: function () {
                    lw.dead = true;
                    lw.pause();
                },
                play: function () {
                    if (lw.dead) {
                        return;
                    }
                    if (lw.alert.shown) {
                        lw.alert.close();
                    } else {
                        lw.playing = true;
                        angular.forEach(lw.events, lw.eventRun);
                    }
                },
                pause: function () {
                    lw.playing = false;
                    angular.forEach(lw.events, function (event) {
                        if (event.timer !== undefined) {
                            clearInterval(event.timer);
                            event.timer = undefined;
                        }
                    });
                },
                alert: {
                    shown: false,
                    mode: '',
                    head: '',
                    msg: '',
                    callback: undefined,
                    show: function (mode, head, msg, callback) {
                        lw.pause();
                        lw.alert.mode = mode;
                        lw.alert.head = head;
                        lw.alert.msg = msg;
                        lw.alert.callback = callback;
                        lw.alert.shown = true;
                    },
                    close: function () {
                        lw.alert.shown = false;
                        if (angular.isFunction(lw.alert.callback)) {
                            lw.alert.callback();
                        }
                        lw.play();
                    },
                    logs: [],
                    log: function (message) {
                        lw.alert.logs.splice(0, 0, message);
                        lw.alert.logs.splice(10);
                    }
                }
            };

            // lw.events.tick = {
            //     interval: 1,
            //     s: 0,
            //     fn: function () {
            //         lw.events.tick.s++;
            //         console.log(lw.events.tick.s + 's passed...');
            //     }
            // };

            // lw.events.debug = {
            //     interval: 1,
            //     fn: function () {
            //         if (lw.properties['wood']) {
            //             lw.propertyAdd('wood', 100);
            //         }
            //     }
            // };

            lw.actionAdd('woodCollect', {
                head: '收集木料',
                msg: '从森林中收集木料...',
                pay: {wood: {amount: 1, head: '木料', msg: '组建木质物件的原材料.'}},
                percent: 0,
                fn: function (action) {
                    var recoverRate = 80 * (1 - Math.atan(action.pay.wood.amount) * 2 / Math.PI);
                    action.disabled = true;
                    action.percent = 100;
                    lw.eventRegister('woodCollecting', {
                        interval: 0.2,
                        fn: function () {
                            action.percent -= recoverRate;
                            if (action.percent <= 1) {
                                action.percent = 0;
                                lw.eventRemove('woodCollecting');
                                action.disabled = false;
                            }
                        }
                    });
                }
            });
            lw.actionAdd('collectorAdvance', {
                head: '制作木筐',
                msg: '一次可以收集更多木料.',
                fee: {wood: 3},
                pay: {bracket: {amount: 1, head: '木筐', msg: '收集木料的工具.'}},
                level: 0,
                feeLevel: [10, 20],
                advanceLevel: [20, 30, 50],
                fn: function (action) {
                    lw.actions.woodCollect.pay.wood.amount = action.advanceLevel[action.level];
                    lw.alert.log('收集木料的效率提高了.')
                    if (action.level >= action.feeLevel.length) {
                        delete lw.actions.collectorAdvance;
                        lw.alert.log('制作更多木筐已经不能增加收益.')
                    } else {
                        action.fee.wood.amount = action.feeLevel[action.level];
                        action.level++;
                    }
                }
            });
            lw.actionAdd('houseBuild', {
                head: '建造木屋',
                msg: 'My house is my castle.',
                fee: {wood: 200},
                pay: {house: {amount: 1, head: '木屋', msg: '生存.'}},
                level: 0,
                feeLevel: [300, 350, 400, 500],
                fn: function (action) {
                    action.fee.wood.amount = action.feeLevel[action.level];
                    action.level++;
                    if (action.level > action.feeLevel.length) {
                        delete lw.actions.houseBuild;
                        lw.alert.log('没有更多的空地建木屋了.')
                    }
                }
            });

            $scope.lw = lw;
            $scope.Math = Math;
            lw.play();
        }
    ]);