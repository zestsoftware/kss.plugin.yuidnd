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

    function dom_getLastElement(el) {
        for (var i=el.childNodes.length-1; i >= 0; i--) {
            var child = el.childNodes[i];
            if (child.nodeType == child.ELEMENT_NODE) {
                return child;
            };
        };
    };

    function dom_getNearestChild(root, el) {
        for (var i=0; i < root.childNodes.length; i++) {
            var child = root.childNodes[i];
            if (child.nodeType != 1) {
                continue;
            };
            if (Dom.getXY(el)[1] < Dom.getXY(child)[1]) {
                return child;
            };
        };
    };

    function dom_getNextElementSibling(el) {
        var next = el.nextSibling;
        while (next && next.nodeType != 1) {
            next = next.nextSibling;
        };
        return next;
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
    };

    Droppable.prototype.allowedElements = function allowedElements(nodename) {
        if (nodename == 'tbody') {
            return ['tr'];
        } else if (nodename == 'ol' || nodename == 'ul') {
            return ['li'];
        };
    };

    Droppable.prototype.continueDropEvent =
            function continueDropEvent(el, targetel, executableAction) {
        /* actually handle the drop

            this is done here rather than on the Draggable because we know
            a bit better what action to perform
        */
        if (!el) {
            return;
        };
        var droppable = this.getEl();
        droppable.isEmpty = false;
        var parms = {};
        if (this.config.action == 'order') {
            // XXX Sometimes targetel is not in the droppable.
            // This is obviously a problem with its selection
            // and it observably in FF2 and IE6 when dropping the last element
            // to itself, not into the empty landing box but slightly above it.
            // In these cases I observed (on FF) targetel to be
            // an empty <div style="height: 0px">, (on IE( a <div/>).
            // The only sensible workarounf here is to do an append
            // to the end of the container,
            // which is, by chance, also what we expect to happen.
            // XXX if we fail to do this quirk, the following would happen:
            // - on FF2 we get 'parentNode has no properties' js error,
            // - on IE6, we get no error but the dropped node gracelessly disappear.
            if (targetel && targetel.parentNode != droppable) {
                kukit.logWarning('Oops, yuidnd wanted to drop before a foul target element. I log it to the next line for diagnosis:');
                targetel = null;
            };
            kukit.logDebug('targetel: ' + targetel +
                           ', droppable: ' + droppable);
            if (targetel) {
                targetel.parentNode.insertBefore(el, targetel);
            } else {
                droppable.appendChild(el);
            };
            parms['dropContainerId'] = droppable.id;
            var currentIndex = -1;
          var dropIndex = -1;
            for (var i=0; i < droppable.childNodes.length; i++) {
                var child = droppable.childNodes[i];
                // this needs to check if the element is a draggable, too
                if (child.nodeType != child.ELEMENT_NODE ||
                        !child.id) {
                    continue;
                };
                var draggable = ddm.getDDById(child.id);
                if (!draggable) {
                    continue;
                };
                currentIndex += 1;
                if (child === el) {
                    dropIndex = currentIndex;
                    break;
                };
            };
            parms['dropIndex'] = dropIndex.toString();
        } else if (this.config.action == 'discard') {
            el.parentNode.removeChild(el);
        } else {
            // fill
            dom_replaceContent(droppable, el);
        };
        if (executableAction) {
            executableAction({defaultParameters: parms});
        };
    };

    Droppable.prototype.getEl = function getEl() {
        var el = yutil.DDTarget.prototype.getEl.apply(this, arguments);
        if (el.nodeName.toLowerCase() == 'table') {
            var tbody = el.getElementsByTagName('tbody')[0];
            if (tbody) {
                return tbody;
            };
        };
        return el;
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
        this.config = config;
        this.isTarget = false;
        el.__draggable = true;
        this.lastY = 0;
        if (config.handleClass) {
            // XXX hmmm... a NodeIterator would be nice here...
            var allels = el.getElementsByTagName('*');
            var handles = [];
            for (var i=0; i < allels.length; i++) {
                var child = allels[i];
                if (child.className == config.handleClass) {
                    if (!child.id) {
                        kukit.logWarning('yuidnd drag handles need to have ' +
                                         'an id. (className ' +
                                         config.handleClass +')');
                    };
                    this.setHandleElId(child.id);
                };
            };
        };
    };

    Draggable.prototype.startDrag = function startDrag(x, y) {
        /* this is called when the draggable is 'picked up'
        */
        kukit.log('starting drag on ' + this.id + ', coords: (' + x +
                  ', ' + y + ')');
        var dragel = this.getDragEl();
        var sourceel = this.getEl();
        if (!sourceel || !sourceel.parentNode) {
            return;
        };

        // XXX perhaps using cloneNode() yields better results here, but not
        // in all browsers obviously :|
        dragel.innerHTML = sourceel.innerHTML;

        if (this.config.action == 'delete') {
            var replacement = sourceel.ownerDocument.createElement('div');
            Dom.setStyle(replacement, 'height', '0px');
            sourceel._replacement = replacement;
            sourceel.parentNode.replaceChild(replacement, sourceel);
            //Dom.setStyle(sourceel, 'visibility', 'hidden');
        } else if (this.config.action == 'ghost') {
            Dom.addClass(sourceel,
                         (this.config.ghostClass || 'kss-dragdrop-ghost'));
        };

        // XXX can we somehow copy styles here? :|
        Dom.addClass(dragel,
                     (this.config.draggingClass || 'kss-dragdrop-dragging'));
        if (this.config.dragStartAction) {
            this.config.dragStartAction();
        };
    };

    Draggable.prototype.endDrag = function endDrag(e) {
        /* end drag

            moves the element to its target, or back to its origin (nicely
            animated of course ;)
        */
        kukit.log('end drag ' + this.id);
        if (this._order_clone) {
            Dom.setStyle(this._order_clone, 'display', 'none');
            this._order_clone.parentNode.removeChild(this._order_clone);
            delete this._order_clone;
        };
        var sourceel = this.getEl();
        var dragel = this.getDragEl();

        Dom.setStyle(dragel, 'visibility', '');
        var motion = new yutil.Motion(
            dragel,
            {points: {to: Dom.getXY(sourceel)}},
            this.config.animationSpeed || 0.2,
            yutil.Easing.easeout
        );
        var self = this;
        motion.onComplete.subscribe(
            function onMotionComplete() {
                // We must not only make the drag element hidden,
                // we must also delete its content.
                // because certain elements like input fields
                // and buttons would remain visible on FireFox
                Dom.setStyle(dragel, 'visibility', 'hidden');
                while (dragel.hasChildNodes()) {
                    dragel.removeChild(dragel.firstChild);
                    }
                Dom.setStyle(sourceel, 'visibility', '');
                if (sourceel._replacement && sourceel._replacement.parentNode) {
                    // This happens when there was no dropping:
                    // that is the dragged element moves back to its
                    // original place.
                    // In the other case: if the drag has been succeeded,
                    // the removal would have been taken place
                    // from onDragDrop, already.
                    sourceel._replacement.parentNode.replaceChild(
                        sourceel, sourceel._replacement);
                    // XXX: delete fails on the node on IE
                    // (Object does not support this operation)
                    //delete sourceel._replacement;
                    sourceel._replacement = null;
                };
                if (self.config.action == 'ghost') {
                    Dom.removeClass(sourceel,
                        (self.config.ghostClass || 'kss-dragdrop-ghost'));
                };
            }
        );
        motion.animate();
    };

    Draggable.prototype.onDragDrop = function onDragDrop(e, id) {
        /* the item is dropped into the droppable

            what happens mostly depends on droppable config, so at
            some point we pass control over to a method on that
        */
        if (this._order_clone) {
            this._order_clone.parentNode.removeChild(this._order_clone);
            delete this._order_clone;
        };
        if (ddm.interactionInfo.drop.length == 1) {
            var sourceel = this.getEl();
            Dom.setStyle(sourceel, 'visibility', '');
            if (sourceel._replacement && sourceel._replacement.parentNode) {
                sourceel._replacement.parentNode.replaceChild(
                    sourceel, sourceel._replacement);
                // XXX: delete fails on the node on IE
                // (Object does not support this operation)
                //delete sourceel._replacement;
                sourceel._replacement = null;
            };
            var point = ddm.interactionInfo.point;
            var region = yutil.Region.getRegion(sourceel);
            var droppable = ddm.getDDById(id);
            var targetel = this._destel;
            if (!region.intersect(point)) {
                var destel = Dom.get(id);
                droppable.continueDropEvent(sourceel, targetel,
                                            this.config.dragSuccessAction);
                Dom.removeClass(sourceel,
                                (this.config.ghostClass ||
                                 'kss-dragdrop-ghost'));
                ddm.refreshCache();
            };
        };
    };

    Draggable.prototype.onDragOver = function onDragOver(e, id) {
        /* make place for the element to add it

            this is only used for ordered draggables

            note that the current behaviour is a bit strange: as soon as room
            is made for a draggable in a certain orderable, that room will
            be where the draggable is moved 'back' to on 'endDrag' - perhaps
            we just want to disable (or improve) this
        */
        this._destel = false;

        // if we have an _order_clone (space to visualize where draggable will
        // be dropped), remove it
        if (this._order_clone) {
            this._order_clone.parentNode.removeChild(this._order_clone);
            delete this._order_clone;
        };
        // find the source element
        var sourceel = this.getEl();
        var droppable = ddm.getDDById(id);
        if (droppable.config.action != 'order') {
            return;
        };
        if (this.is_not_allowed(sourceel, droppable)) {
            kukit.logWarning('element ' + sourceel.nodeName +
                             ' not allowed inside ' + droppable.nodeName);
            return;
        };

        // find the destination element
        var destparent = Dom.get(id);
        var destel = dom_getNearestChild(destparent, this.getDragEl());
        if (this.allowed && destel.nodeName != sourceel.nodeName) {
            // this is only called for tr and li draggables (when this is
            // the case, this.allowed is set, else it isn't)
            kukit.logWarning('destel ' + destel.nodeName + ' not of type' +
                             sourceel.nodeName);
            return;
        };
        this._destel = destel;
        if (destel == sourceel ||
                destel == dom_getNextElementSibling(sourceel)) {
            return;
        };

        // create a clone (space for droppable)
        var clone = sourceel.cloneNode(true);
        Dom.setStyle(clone, 'visibility', '');
        Dom.addClass(clone, (this.config.cloneClass || 'kss-dragdrop-clone'));
        var addel = clone;
        if (clone.nodeName.toLowerCase() != 'tr') {
            var borderdiv = sourceel.ownerDocument.createElement('div');
            borderdiv.appendChild(clone);
            Dom.addClass(borderdiv, (this.config.cloneBorderClass ||
                                     'kss-dragdrop-clone-border'));
            addel = borderdiv;
        };
        this._order_clone = addel;

        // add the clone
        if (destel) {
            destparent.insertBefore(addel, destel);
        } else {
            destparent.appendChild(addel);
        };

        Dom.removeClass(clone,
            (this.config.ghostClass || 'kss-dragdrop-ghost'));
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
            action: 'ghost'
        };
        var node;
        if (opers_by_eventname.dragstart) {
            var bindoper = opers_by_eventname.dragstart;
            node = bindoper.node;
            if (!node || !node.id) {
                throw new Error('yuidnd events can bind only to nodes with ' +
                                'an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragstart event binding';
            // get params ready
            bindoper.evaluateParameters([], {
                action: 'ghost',
                ghostClass: 'kss-dragdrop-ghost',
                animationSpeed: '0.2',
                draggingClass: 'kss-dragdrop-dragging',
                handleClass: '',
                targetIds: ''
            });
            bindoper.parms.animationSpeed = oper_evalFloat(
                    bindoper.parms.animationSpeed);
            bindoper.evalList('targetIds');

            // copy some of the params to config
            config.action = bindoper.parms.action;
            if (config.action != 'ghost' && config.action != 'delete' &&
                    config.action != 'preserve') {
                kukit.logWarning('drag action ' + config.action +
                                 ' not supported, falling back to ' +
                                 '\'ghost\' (possible values: \'preserve\', ' +
                                 '\'ghost\' or \'delete\')');
            };
            config.ghostClass = bindoper.parms.ghostClass;
            config.animationSpeed = bindoper.parms.animationSpeed;
            config.draggingClass = bindoper.parms.draggingClass;
            config.handleClass = bindoper.parms.handleClass;

            var groups = [];
            var targetids = bindoper.parms.targetIds;
            for (var i=0; i < targetids.length; i++) {
                groups.push(string_strip(targetids[i]));
            };

            if (bindoper.hasExecuteActions()) {
                config.dragStartAction = bindoper.makeExecuteActionsHook();
            };
        };
        if (opers_by_eventname.dragsuccess) {
            var bindoper = opers_by_eventname.dragsuccess;
            node = bindoper.node;
            if (!node || !node.id) {
                throw new Error('yuidnd events can bind only to nodes with ' +
                                'an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragsuccess event binding';
            if (bindoper.hasExecuteActions()) {
                config.dragSuccessAction = bindoper.makeExecuteActionsHook();
            };
        };
        if (opers_by_eventname.dragfailure) {
            var bindoper = opers_by_eventname.dragfailure;
            node = bindoper.node;
            if (!node || !node.id) {
                throw new Error('yuidnd events can bind only to nodes with ' +
                                'an id.');
            };
;;;         bindoper.componentName = 'yuidnd dragfailure event binding';
            if (bindoper.hasExecuteActions()) {
                config.dragFailureAction = bindoper.makeExecuteActionsHook();
            };
        };
        var maingroup = this.__binderId__ || 'default';
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
            throw new Error('yuidnd events can bind only to nodes with ' +
                            'an id.');
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
        bindoper.evalBool('maintainOffset');
        bindoper.evalBool('primaryButtonOnly');

        // copy some of the params to config
        config.action = bindoper.parms.action;
        if (config.action != 'fill' &&
                config.action != 'discard' &&
                config.action != 'order') {
            kukit.logWarning('drop action ' + config.action +
                             ' not supported, falling back to ' +
                             '\'fill\' (possible values: \'discard\', ' +
                             '\'fill\' or \'order\')');
        };
        config.padding = bindoper.parms.padding;
        config.maintainOffset = bindoper.parms.maintainOffset;
        config.primaryButtonOnly = bindoper.parms.primaryButtonOnly;
        //config.tag = bindoper.parms.tag;

        if (bindoper.hasExecuteActions()) {
            config.dragStartAction = bindoper.makeExecuteActionsHook();
        };
        var group = this.__binderId__ || 'default';
        new Droppable(node.id, group, config);
    };

    kukit.eventsGlobalRegistry.registerForAllEvents(
            'yuidnd', ['dragstart', 'dragsuccess', 'dragfailure'],
            DnDEventBinder, '__bind_drag__', null, 'Node');
    kukit.eventsGlobalRegistry.registerForAllEvents(
            'yuidnd', ['drop'],
            DnDEventBinder, '__bind_drop__', null, 'Node');
};
