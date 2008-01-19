
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
 * Scriptaculous drag and drop support (sdnd)
 *
 */

kukit.sdnd = {};

kukit.sdnd.base_library_present = null;

try {
    Droppables = Droppables;
    kukit.sdnd.base_library_present = true;
} catch(e) {
    Droppables = {};
};

kukit.sdnd.initDroppables = function() {
    kukit.sdnd.Droppables = Object.extend(Droppables, {

        activate: function(drop, drag) {
            if(drop.hoverclass)
                Element.addClassName(drop.element, drop.hoverclass);
            this.last_active = drop;
        },

        deactivate: function(drop, drag) {
            if(drop.hoverclass)
                Element.removeClassName(drop.element, drop.hoverclass);
            this.last_active = null;
        },

        // only deactivate/activate if drop focus changes
        // call 'this' instead of Droppables
        show: function(point, element) {
            if(!this.drops.length) return;
            var affected = [];
            
            var self = this;
            this.drops.each( function(drop) {
                if(self.isAffected(point, element, drop))
                    affected.push(drop);
            });

            var last_active = this.last_active;
            var new_active;
                
            if(affected.length>0) {
                drop = this.findDeepestChild(affected);
                if(last_active != drop) {
                    new_active = drop;
                }
            }

            if (last_active && new_active) {
                if(last_active.onResethover) {
                    Position.within(last_active.element, point[0], point[1]);
                    last_active.onResethover(element, last_active.element, Position.overlap(last_active.overlap, last_active.element));
                }
                this.deactivate(last_active);
            }
            if (new_active) {
                this.activate(new_active);
            if(new_active.onHover) {
                    Position.within(new_active.element, point[0], point[1]);
                    new_active.onHover(element, new_active.element, Position.overlap(new_active.overlap, new_active.element));
                }
            }
        }

    });
    kukit.sdnd.initDroppables = function() {};
};

/* the event binder */

kukit.sdnd.DragAndDropEvent = function() {
    kukit.sdnd.initDroppables();
    this.dragparms = {};
};

kukit.sdnd.DragAndDropEvent.prototype.__bind_drag__ = function(opers_by_eventname, node) {
    // set options for dnd
    var options = {};
    if (opers_by_eventname.drag) {
        var oper = opers_by_eventname.drag;
        ;;; oper.componentName = 'sdnd-drag event binding';
        oper.evaluateParameters([], {'constraint' : 'none', 
                                'revert': '', 
                                'failedrevert': 'true', 
                                'handleclass': '',
                                'ghosting': ''});
        oper.evalBool('revert');
        oper.evalBool('failedrevert');
        oper.evalBool('ghosting');
        options.ghosting = oper.parms.ghosting;
        options.revert = oper.parms.revert;
        if (oper.parms.constraint != 'horizontal' && oper.parms.constraint != 'vertical' && oper.parms.constraint != 'none') {
            throw 'Unknown sdnd-drag constraint "' + oper.parms.constraint + '"';
        }
        // if there is no revert, yet force the element to pop back to its place by default
        // (this would not normally happen, it would just stay there even if it is not
        // dropped to a landing zone.
        // We do this by adding a dumb revert effect. (This can be prohibited by setting
        // evt-sdnd-drag-failedrevert to false.)
        if (oper.parms.failedrevert && ! oper.parms.revert) {
            options.reverteffect = function(element) {
                element.style.top  = 0;
                element.style.left = 0;
            };
            options.revert = true;
        }
        //
        if (oper.hasExecuteActions())
            options.onDrag = oper.makeExecuteActionsHook();
        if (oper.parms.constraint != 'none')
            options.constraint = oper.parms.constraint;
        if (oper.parms.handleclass)
            options.handle = oper.parms.handleclass;
    }
    if (opers_by_eventname.start) {
        var oper = opers_by_eventname.start;
        ;;; oper.componentName = 'sdnd-start event binding';
        oper.evaluateParameters([], {});
        if (oper.hasExecuteActions())
            options.onStart = oper.makeExecuteActionsHook();
    }
    if (opers_by_eventname.end) {
        var oper = opers_by_eventname.end;
        ;;; oper.componentName = 'sdnd-end event binding';
        oper.evaluateParameters([], {});
        if (oper.hasExecuteActions())
            options.onEnd = oper.makeExecuteActionsHook();
    }
    // make node draggable
    new Draggable(node, options);
};

kukit.sdnd.DragAndDropEvent.prototype.__default_drag__ = function(name, oper) {
    if (name != 'drag') {
        return;
    }
    // This method can take any parameters. It will store them and the drop event will
    // use it as defaultparms.
    var parms = oper.parms;
    this.dragparms = parms;
    // add some parameters in case nothing is given: drag and dragid
    if (typeof parms.drag == 'undefined')
        parms.drag = oper.node;
    if (typeof parms.dragid == 'undefined')
        if (oper.node)
            parms.dragid = oper.node.id;
};

kukit.sdnd.DragAndDropEvent.prototype.__bind_drop__ = function(opers_by_eventname, node) {
    // set options for dnd
    var options = {};
    if (opers_by_eventname.hover) {
        var oper = opers_by_eventname.hover;
        ;;; oper.componentName = 'sdnd-hover event binding';
        oper.evaluateParameters([], {'hoverclass': ''});
        if (oper.hasExecuteActions())
            // this will be called when the draggable enters the area over it
            options.onHover = oper.makeExecuteActionsHook();
        if (oper.parms.hoverclass)
            options.hoverclass = oper.parms.hoverclass;
            kukit.logWarning(options.hoverclass);
    }
    if (opers_by_eventname.resethover) {
        var oper = opers_by_eventname.resethover;
        ;;; oper.componentName = 'sdnd-resethover event binding';
        oper.evaluateParameters([], {});
        if (oper.hasExecuteActions())
            // this will be called when the draggable enters to the next droppable
            options.onResethover = oper.makeExecuteActionsHook();
    }
    if (opers_by_eventname.drop) {
        var oper = opers_by_eventname.drop;
        ;;; oper.componentName = 'sdnd-drop event binding';
        oper.evaluateParameters([], {'resumeposition': 'true'});
        // resume the position after the drop event, ie. the object stays in place on
        // the screen despite whatever we make with it
        oper.evalBool('resumeposition');
        if (oper.hasExecuteActions()) {
            var f = oper.makeExecuteActionsHook();
            var self = this;
            if (oper.parms.resumeposition) {
                options.onDrop = function(element, last_active, evt) {
                    // This solution is not the best, there is a short blink
                    // of the element, I believe
                    var drag = self.dragparms.drag;
                    var pos1 = Position.cumulativeOffset(drag);
                    f({browserevent: evt, defaultparms: self.dragparms});
                    var pos2 = Position.cumulativeOffset(drag);
                    var delta = [parseInt(Element.getStyle(drag,'left') || '0'),
                                 parseInt(Element.getStyle(drag,'top') || '0')];
                    drag.style.left = (delta[0] + pos1[0] - pos2[0]) + 'px';
                    drag.style.top = (delta[1] + pos1[1] - pos2[1]) + 'px';
                };
            } else {
                options.onDrop = function(element, last_active, evt) {
                    // force our revert effect: this is needed to not do the revert
                    // when we dropped.
                    element.style.top  = 0;
                    element.style.left = 0;
                    f({browserevent: evt, defaultparms: self.dragparms});
                };
            }
        }
    }
    // make node a landing zone
    kukit.sdnd.Droppables.add(node, options);
};

if (kukit.sdnd.base_library_present) {
    kukit.eventsGlobalRegistry.registerForAllEvents('sdnd', ['drag', 'start', 'end'], kukit.sdnd.DragAndDropEvent, '__bind_drag__', '__default_drag__', 'Node');
    kukit.eventsGlobalRegistry.registerForAllEvents('sdnd', ['drop', 'hover', 'resethover'], kukit.sdnd.DragAndDropEvent, '__bind_drop__', null, 'Node');
    kukit.log('draganddrop.js base library found, registering sdnd events');
} else {
    kukit.logWarning('draganddrop.js base library not present, not registering sdnd events');
}

kukit.actionsGlobalRegistry.register('sdnd-resetPosition', function(oper) {
    ;;; oper.componentName = 'sdnd-resetPosition action';
    oper.evaluateParameters([], {});
    oper.node.style.top = '0';
    oper.node.style.left = '0';
});
kukit.commandsGlobalRegistry.registerFromAction('sdnd-resetPosition', kukit.cr.makeSelectorCommand);


/*
 * Event binder for sortables
 *
 * Comments:
 *
 * In particular there are the following problems:
 *
 * 1. The Sortables code builds on Draggable and Droppable in such a way that it hides
 *    Draggable and Droppable, and it is not possible to extend them or use their original
 *    event hooks in case they are used from Sortable. This means that we have a totally
 *    different way of working with Sortables then with drag and drop.
 *
 * 2. The Sortables define an onUpdate event that is taking the entire list of contained
 *    ids as an attribute. Since we rather want a "drop" event, this gets implemented but
 *    again, since we cannot access the original drag and drop events from here, we make
 *    this emulated that requires a painful processing of the entire list.
 *    (Remark: in addition if other then the sortables rearrange the elements within
 *    the container, also needs to call sortrefresh as a continuation event because of
 *    this, this will refresh the "state" of the containers.)
 *
 * 3. The Sortables object is a singleton. This is a problem because all sortable container
 *    will act as one common pool. This is a problem because this way we cannot have more
 *    independent sortable pools in the screen. This is a limitation that unfortunately
 *    we cannot live with. (Note. in kss we could use "binder ids" to have this work in a natural
 *    way, in case the lib supported it.)
 *
 * The above problems seems to be solvable only by changing the original scriptaculous code,
 * or at least include the necessary hooks into it so that we can use inheritence to extend
 * it.
 *
 */

kukit.sdnd.SortableEvent = function() {
};

// This one takes a list of items, items contain nodes and opers_by_eventname
kukit.sdnd.SortableEvent.prototype.__bind__ = function(allitems) {
    var bindings = [];
    var containment = [];
    for (var i=0; i < allitems.length; i++) {
        var item = allitems[i];
        var node = item.node;
        var opers_by_eventname = item.opers_by_eventname;
        /// XXX after refactoring... this code had no bbb.
        if (typeof(opers_by_eventname) == 'undefined') {
            var opers_by_eventname = item.opersByEventName;
        }

        // set options for dnd
        var options = {};
        if (! node || ! node.id) {
            throw 'sdnd-sortupdate and sdnd-sortchange must bind to nodes with id.';
        }
        var tagname = node.tagName.toLowerCase();
        if (tagname == 'table' || tagname == 'tnode' || tagname == 'tbody' || tagname == 'tr') {
            throw 'sdnd-sortupdate and sdnd-sortchange is not allowed to bind on the following nodes: table, tnode, tbody, tr';
        }
        if (opers_by_eventname.sortupdate) {
            var oper = opers_by_eventname.sortupdate;
            ;;; oper.componentName = 'sdnd-sortupdate event binding';
            oper.evaluateParameters([], {constraint: 'none', overlap: 'vertical', tag: 'li', dropOnEmpty: 'true', handleclass: ''});
            if (oper.parms.constraint != 'horizontal' && oper.parms.constraint != 'vertical' && oper.parms.constraint != 'none') {
                throw 'Unknown sdnd-sortupdate constraint "' + oper.parms.constraint + '"';
            }
            oper.evalBool('dropOnEmpty');
            if (oper.parms.overlap != 'horizontal' && oper.parms.overlap != 'vertical') {
                throw 'Unknown sdnd-sortupdate overlap "' + oper.parms.overlap + '"';
            }
            options.overlap = oper.parms.overlap;
            if (oper.parms.constraint != 'none')
                options.constraint = oper.parms.constraint;
            if (oper.parms.handleclass)
                options.handle = oper.parms.handleclass;
            if (oper.hasExecuteActions())
                var f = oper.makeExecuteActionsHook();
            var self = this;
            options.onUpdate = function(element) {
                var defaultparms = self.collectDefaultParms(element);
                f({defaultparms: defaultparms});
                // continue with the drop event, if we dropped here.
                if (defaultparms.dropid) {
                    self.__continueEvent__('sortdrop', oper.node, defaultparms);
                }
            };
            options.tag = oper.parms.tag;
            options.dropOnEmpty = oper.parms.dropOnEmpty;
        }
        if (opers_by_eventname.sortchange) {
            var oper = opers_by_eventname.sortchange;
            ;;; oper.componentName = 'sdnd-sortchange event binding';
            oper.evaluateParameters([], {});
            if (oper.hasExecuteActions())
                options.onChange = oper.makeExecuteActionsHook();
        }
        // make container sortable
        bindings.push({node: node, options: options});
        containment.push(node);
    }
    // Now bind all the nodes together, this was needed because we wanted to collect
    // the containers.
    for (var i=0; i < bindings.length; i++) {
        var binding = bindings[i];
        binding.options.containment = containment;
        var options = binding.options;
        if (! options.contraints)
            // need to set it to false, because the default value
            // is really vertical...
            options.constraint = false;
        // store the original ids
        kukit.log(binding.node);
        kukit.log(options);
        Sortable.create(binding.node, options);
        kukit.log('here');
        // store original order on options
        var realoptions = Sortable.options(binding.node);
        kukit.log(realoptions);
        realoptions.originalIds = this.getOrderedIds(binding.node);
    }
};

// all the next havoc is to emulate a "drop" event with the necessary default parms.
// This could become unnecessary if the original code supported our needs.
kukit.sdnd.SortableEvent.prototype.collectDefaultParms = function(element) {
    // element is the container node now.
    var parms = {};
    var newIds = this.getOrderedIds(element);
    parms.idlist = newIds.join(' ');
    // Take the result. We need which element is dropped to where, and not the
    // entire list. Unfortunately this is not possible without copypasting the
    // full scriptaculous code and inserting the necessary hooks. So instead we
    // take the result as list, and try to deduct the difference.
    var options = Sortable.options(element);
    var originalIds = options.originalIds;
    // update the list in the options
    if (originalIds.length > newIds.length) {
        // we did not drop an element here.
        // set the new order now, that we are ok
        options.originalIds = newIds;
        return parms;
    }
    // find the first place where they differ
    for (var i=0; i<originalIds.length; i++) {
        if (originalIds[i] != newIds[i]) {
            break;
        }
    }
    // We found the first differing element. See the next one...
    if (newIds[i+1] == originalIds[i]) {
        parms.dragid = newIds[i];
        parms.dropid = newIds[i+1];
        // here, dropid can be undefined if we drop after the last one.
        // If this happens, we give the container node as a target.
        if (! parms.dropid) {
            parms.dropid = element.id;
        }
    } else if (newIds[i] == originalIds[i+1]) {
        // now we found the dragged elem, we just need to find
        // where it was dropped
        parms.dragid = originalIds[i];
        for (i=i+1; i<originalIds.length; i++) {
            if (newIds[i] == parms.dragid) {
                break;
            }
        }
        parms.dropid = newIds[i+1];
    } else {
        throw 'Internal error, mismatch in sortables';
    }
    // supply the rest of the parameters
    parms.drag = document.getElementById(parms.dragid);
    parms.drop = document.getElementById(parms.dropid);
    // set the new order now, that we are ok
    options.originalIds = newIds;
    return parms;
};

kukit.sdnd.SortableEvent.prototype.getOrderedIds = function(element) {
    var options = Sortable.options(element);
    if (options.tree) {
        throw 'Tree not implemented';
    } else {
      var options = Object.extend(Sortable.options(element), arguments[1] || {});
      return $(Sortable.findElements(element, options) || []).map( function(item) {
            return item.id;});
    }
};

// This is a programmatical (continuiation) event that refreshes the state of the sortable,
// it is needed because collectDefaultParms compares the state with the previous
// one, so this needs to be called if someone else changed the sortable.
kukit.sdnd.SortableEvent.prototype.__default_refresh__ = function(name, oper) {
    ;;; oper.componentName = 'sdnd-sortrefresh event default action';
    oper.evaluateParameters([], {});
    // store original order on options
    var realoptions = Sortable.options(oper.node);
    realoptions.originalIds = this.getOrderedIds(oper.node);
};

if (kukit.sdnd.base_library_present) {
    kukit.eventsGlobalRegistry.registerForAllEvents('sdnd', ['sortupdate', 'sortchange', 'sortdrop'], kukit.sdnd.SortableEvent, '__bind__', null, 'AllNodes');
    kukit.eventsGlobalRegistry.register('sdnd', 'sortrefresh', kukit.sdnd.SortableEvent, null, '__default_refresh__');
}

