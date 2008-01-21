/*
 * Copyright (c) 2007
 * Authors: KSS Project Contributors (see docs/CREDITS.txt)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as published
 * by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
 * 02111-1307, USA.
 */

/* 
 * YUI drag and drop support (yuidnd)
 *
 */

kukit.yuidnd = {};

kukit.yuidnd.base_library_present = null;

try {
    YAHOO.util.DragDrop;
    kukit.yuidnd.base_library_present = true;
    kukit.log('loading YAHOO.util.DragDrop');
} catch(e) {
    // XXX
    kukit.logWarning('missing YAHOO.util.DragDrop');
};

if (kukit.yuidnd.base_library_present) {
    // some closures to make our life a bit easier...
    var yutil = YAHOO.util;
    var yextend = YAHOO.extend;
    var Dom = yutil.Dom;
    var Event = yutil.Event;
    var ddm = yutil.DragDropMgr;

    // some (currently private) helper functions
    function array_indexOf(haystack, needle, obj_equality) {
        /* returns the index of 'needle' in 'haystack'

            returns -1 if 'needle' couldn't be found
        */
        kukit.log(haystack);
        kukit.log(needle);
        for (var i=0; i < haystack.length; i++) {
            if ((obj_equality && needle === haystack[i]) ||
                    !obj_equality && needle == haystack[i]) {
                return i;
            };
        };
        return -1;
    };

    function dom_replaceContent(parentNode) {
        /* replace the content of a node
        
            removes all nodes from parentNode and then adds every additional
            argument (which are assumed to be nodes too)
        */
        while (parentNode.childNodes.length) {
            parentNode.removeChild(parentNode.lastChild);
        };
        for (var i=1; i < arguments.length; i++) {
            parentNode.appendChild(arguments[i]);
        };
    };

    function dom_getNearestChild(root, x, y) {
        var region = new yutil.Region(y, x, y + 1, x - 1);
        for (var i=0; i < root.childNodes.length; i++) {
            var child = root.childNodes[i];
            if (child.nodeType != child.ELEMENT_NODE) {
                continue;
            };
            var cregion = yutil.Region.getRegion(child);
            if (cregion.intersect(region)) {
                return child;
            };
        };
    };

    function string_strip(s) {
        var stripspace = /^\s*([\s\S]*?)\s*$/;
        return stripspace.exec(s)[1];
    };

    function oper_evalFloat(s) {
        return parseFloat(s);
    };

    // Droppable and Draggable are both loosely based on an example of the YUI
    // lib: http://developer.yahoo.com/yui/examples/dragdrop/dd-reorder.html
    var Droppable = kukit.yuidnd.Droppable = function Droppable() {
        if (arguments.length) {
            this._init.apply(this, arguments);
        };
    };

    yextend(Droppable, yutil.DDTarget);

    Droppable.prototype._init = function _init(id, group, config) {
        /* generic droppable 'constructor'

            called for every type of droppable (sortable or not)
        */
        Droppable.superclass.constructor.call(this, id, group, config);
        if (config.action == 'XXXorder') {
            // in the case of a 'sortable' drop target, we assume all direct
            // child elements are sortable items, and check whether they're
            // all of the same type
            var sortel = Dom.get(id);
            var nodename = sortel.nodeName.toLowerCase();
            var allowed = this.allowedElements(nodename);
            this.allowedElement = allowed;
            for (var i=0; i < sortel.childNodes.length; i++) {
                var child = sortel.childNodes[i];
                if (child.nodeType != child.ELEMENT_NODE) {
                    continue;
                };
                if (!child.id) {
                    throw('yuidnd sortable child nodes all require ' +
                          'to have their id set');
                };
                var childname = child.nodeName.toLowerCase();
                if (allowed && array_indexOf(allowed, childname) == -1) {
                    throw('yuidnd sortable node of type ' + childname + ' ' +
                          'not allowed in element of type ' + nodename);
                };
                new kukit.yuidnd.Draggable(child.id, group, config);
            };
        };
    };

    Droppable.prototype.allowedElements = function allowedElements(nodename) {
        if (nodename == 'tbody') {
            return ['tr'];
        } else if (nodename == 'ol' || nodename == 'ul') {
            return ['li'];
        };
    };

    Droppable.prototype.continueDropEvent =
            function continueDropEvent(el, targetel, before) {
        /* actually handle the drop

            this is done here rather than on the Draggable because we know
            a bit better what action to perform
        */
        var droppable = this.getEl();
        droppable.isEmpty = false;
        if (this.config.action == 'order') {
           if (before) {
                droppable.insertBefore(el, targetel);
            } else {
                var realtarget = targetel.nextSibling;
                if (!realtarget) {
                    droppable.appendChild(el);
                } else {
                    droppable.insertBefore(el, realtarget);
                };
            };
        } else if (this.config.action == 'discard') {
            el.parentNode.removeChild(el);
        } else if (this.config.action == 'fill') {
            dom_replaceContent(droppable, el);
        };
        // perform KSS actions
    };

    var Draggable = kukit.yuidnd.Draggable = function Draggable() {
        if (arguments.length) {
            this._init.apply(this, arguments);
        };
    };

    yextend(Draggable, yutil.DDProxy);

    Draggable.prototype._init = function _init(id, group, config) {
        var el = Dom.get(id);
        if (el.__draggable) {
            // already draggable...
            // XXX should we throw an exception instead?
            // (since this means the config is ignored)
            return;
        };
        Draggable.superclass.constructor.call(this, id, group, config);
        this.isTarget = false;
        this.el = this.getDragEl();
        el.__draggable = true;
        // Dom.setStyle(el, 'opacity', 0.67);
        this.goingUp = false;
        this.lastY = 0;
    };

    Draggable.prototype.startDrag = function startDrag(x, y) {
        /* this is called when the draggable is 'picked up'
        */
        kukit.log('starting drag on ' + this.id + ', coords: (' + x +
                  ', ' + y + ')');
        var dragel = this.getDragEl();
        var sourceel = this.getEl();
        if (this.config.action == 'delete') {
            Dom.setStyle(sourceel, 'visibility', 'hidden');
        } else if (this.config.action == 'ghost') {
            Dom.setStyle(sourceel, 'opacity',
                         (this.config.ghostOpacity || 0.6));
            Dom.addClass(sourceel,
                         (this.config.ghostClass || 'kss-dragdrop-ghost'));
        };
        
        // XXX perhaps using cloneNode() yields better results here, but not
        // in all browsers obviously :|
        dragel.innerHTML = sourceel.innerHTML;

        // XXX can we somehow copy styles here? :|
        Dom.addClass(dragel,
                     (this.config.draggingClass || 'kss-dragdrop-dragging'));
        if (this.config.dragStartAction) {
            this.config.dragStartAction();
        };
    };

    Draggable.prototype.endDrag = function endDrag(e) {
        /* end drag without a drop

            moves the element back to its origin (nicely animated of course ;)
        */
        kukit.log('end drag ' + this.id);
        var sourceel = this.getEl();
        var dragel = this.getDragEl();

        // XXX copied, but don't understand why it's required...
        Dom.setStyle(dragel, 'visibility', '');
        var motion = new yutil.Motion(
            dragel,
            {points: {to: Dom.getXY(sourceel)}},
            this.config.animationSpeed || 0.2,
            yutil.Easing.easeout
        );
        motion.onComplete.subscribe(
            function onMotionComplete() {
                // XXX shouldn't we remove it instead?
                Dom.setStyle(dragel, 'visibility', 'hidden');
                Dom.setStyle(sourceel, 'visibility', '');
                if (this.config.action == 'ghost') {
                    Dom.setStyle(sourceel, 'opacity', 1);
                    Dom.removeClass(sourceel,
                        (this.config.ghostClass || 'kss-dragdrop-ghost'));
                };
            }
        );
        motion.animate();
    };

    Draggable.prototype.onDragDrop = function onDragDrop(el, id) {
        /* the item is dropped into the droppable

            what happens mostly depends on droppable config, so at
            some point we pass control over to a method on that
        */
        if (ddm.interactionInfo.drop.length == 1) {
            kukit.log('onDragDrop');
            var point = ddm.interactionInfo.point;
            var region = ddm.interactionInfo.sourceRegion;
            var droppable = ddm.getDDById(id);
            var targetel = droppable.lastSibling;
            var before = false;
            if (this.place_info) {
                targetel = this.place_info[0];
                before = this.place_info[1] < 0;
                this.place_info = null;
            };
            if (!region.intersect(point)) {
                var destel = Dom.get(id);
                droppable.continueDropEvent(this.getEl(), targetel, before);
                ddm.refreshCache();
            };
        };
        if (this.config.dragSuccessAction) {
            this.config.dragSuccessAction();
        };
    };

    Draggable.prototype.onDrag = function onDrag(el) {
        /* set this.goingUp, used to determine where an ordered item is placed
        */
        var y = Event.getPageY(el);
        if (y < this.lastY) {
            this.goingUp = true;
        } else if (y > this.lastY) {
            this.goingUp = false;
        };
        this.lastY = y;
    };

    Draggable.prototype.onDragOver = function onDragOver(e, id) {
        /* make place for the element to add it
        
            this is only used for ordered draggables

            note that the current behaviour is a bit strange: as soon as room
            is made for a draggable in a certain orderable, that room will
            be where the draggable is moved 'back' to on 'endDrag' - perhaps
            we just want to disable (or improve) this
        */
        var sourceel = this.getEl();
        var droppable = ddm.getDDById(id);
        if (droppable.config.action != 'order') {
            return;
        };
        if (this.is_not_allowed(sourceel, droppable)) {
            return;
        };
        var destparent = Dom.get(id);
        var destel = dom_getNearestChild(destparent, e.clientX, e.clientY);
        if (!destel || destel.nodeName != sourceel.nodeName) {
            return;
        };
        if (this.goingUp) {
            this.place_info = [destel, -1];
        } else {
            this.place_info = [destel, 1];
        };
        /*
        if (this.goingUp) {
            destparent.insertBefore(sourceel, destel);
        } else {
            if (destel.nextSibling) {
                destparent.insertBefore(sourceel, destel.nextSibling);
            } else {
                destparent.appendChild(sourceel);
            };
            Dom.setStyle(sourceel, 'visibility', '');
            if (this.config.action == 'ghost') {
                Dom.setStyle(sourceel, 'opacity', 1);
                Dom.removeClass(sourceel,
                    (this.config.ghostClass || 'kss-dragdrop-ghost'));
            };
        };
        */
        ddm.refreshCache();
    };

    Draggable.prototype.is_not_allowed =
            function is_not_allowed(sourceel, droppable) {
        return droppable.allowed && 
                array_indexOf(droppable.allowed,
                              sourceel.nodeName.toLowerCase()) == -1;
    };

    var DnDEventBinder = kukit.yuidnd.DnDEventBinder =
            function DnDEventBinder() {
    };

    DnDEventBinder.prototype.__bind_drag__ =
            function __bind_drag__(opers_by_eventname) {

        var groups = [];
        var config = {
            action: 'ghost',
        };
        var node;
        if (opers_by_eventname.dragstart) {
            var bindoper = opers_by_eventname.dragstart;
            node = bindoper.node;
            if (!node || !node.id) {
                throw('yuidnd events can bind only to nodes with an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragstart event binding';
            // get params ready
            bindoper.evaluateParameters([], {
                action: 'ghost',
                ghostClass: 'kss-dragdrop-ghost',
                ghostOpacity: '0.6',
                animationSpeed: '0.2',
                draggingClass: 'kss-dragdrop-dragging',
                targetIds: ''
            });
            bindoper.parms.ghostOpacity = oper_evalFloat(bindoper.parms.ghostOpacity);
            bindoper.parms.animationSpeed = oper_evalFloat(
                    bindoper.parms.animationSpeed);
            bindoper.evalList('targetIds');

            bindoper.parms.action == 'ghost'

            // copy some of the params to config
            config.action = bindoper.parms.action;
            config.ghostClass = bindoper.parms.ghostClass;
            config.ghostOpacity = bindoper.parms.ghostOpacity;
            config.animationSpeed = bindoper.parms.animationSpeed;
            config.draggingClass = bindoper.parms.draggingClass;
            //config.tag = bindoper.parms.tag;

            var groups = [];
            var targetids = bindoper.parms.targetIds;
            for (var i=0; i < targetids.length; i++) {
                groups.push(string_strip(targetids[i]));
            };

            if (bindoper.hasExecuteActions()) {
                config.dragStartAction = bindoper.makeExecuteActionsHook();
            };
        } else if (opers_by_eventname.dragsuccess) {
            var bindoper = opers_by_eventname.dragsuccess;
            node = bindoper.node;
            if (!node || !node.id) {
                throw('yuidnd events can bind only to nodes with an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragsuccess event binding';
            if (bindoper.hasExecuteActions()) {
                config.dragSuccessAction = bindoper.makeExecuteActionsHook();
            };
        } else if (opers_by_eventname.dragfailure) {
            var bindoper = opers_by_eventname.dragfailure;
            node = bindoper.node;
            if (!node || !node.id) {
                throw('yuidnd events can bind only to nodes with an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragfailure event binding';
            if (bindoper.hasExecuteActions()) {
                config.dragFailureAction = bindoper.makeExecuteActionsHook();
            };
        };
        // XXX does this.id exist?
        var maingroup = this.id || 'default';
        var instance = new Draggable(node.id, maingroup, config);
        for (var i=0; i < groups.length; i++) {
            instance.addToGroup(groups[i]);
        };
    };

    DnDEventBinder.prototype.__bind_drop__ =
            function __bind_drop__(opers_by_eventname) {
        var bindoper = opers_by_eventname.drop;
        var node = bindoper.node;
        if (!node || !node.id) {
            throw('yuidnd events can bind only to nodes with an id.');
        };

        var config = {};
;;;     bindoper.componentName = 'yuidnd drop event binding';
        // get params ready
        bindoper.evaluateParameters([], {
            action: 'fill',
            padding: '0',
            maintainOffset: 'false',
            primaryButtonOnly: 'true'
        });

        bindoper.evalInt('padding');
        bindoper.evalBool('maintainOffset')
        bindoper.evalBool('primaryButtonOnly');

        // copy some of the params to config
        config.action = bindoper.parms.action;
        config.padding = bindoper.parms.padding;
        config.maintainOffset = bindoper.parms.maintainOffset;
        config.primaryButtonOnly = bindoper.parms.primaryButtonOnly;
        //config.tag = bindoper.parms.tag;

        if (bindoper.hasExecuteActions()) {
            config.dragStartAction = bindoper.makeExecuteActionsHook();
        };
        // XXX does this.id exist?
        var group = this.id || 'default';
        new Droppable(node.id, group, config);
    };

    kukit.eventsGlobalRegistry.registerForAllEvents(
            'yuidnd', ['dragstart', 'dragsuccess', 'dragfailure'],
            DnDEventBinder, '__bind_drag__', null, 'Node');
    kukit.eventsGlobalRegistry.registerForAllEvents(
            'yuidnd', ['drop'],
            DnDEventBinder, '__bind_drop__', null, 'Node');
};
