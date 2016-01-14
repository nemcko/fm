(function(window){
    "use strict";

    String.supplant =  String["supplant"] || angular.noop;

    /**
     * AngularJS-GSAP Timeline module that supports a custom DSL for
     * animation definitions using Greensock's TimelineMax API.
     *
     * NOTE: Currently this module has some dependencies upon jQuery() features
     *       in querySelector()...
     *
     * @usage
     * <gs-timeline id="zoom" time-scale="1.4" resolve="preload(selectedTile)" >
     *    <gs-step target="#mask"         style="zIndex:-10;className:''"           duration="0.001" />
     *    <gs-step target="#details"      style="zIndex:-11;className:''"           duration="0.001" />
     *    <gs-step target="#green_status" style="zIndex:-13;className:''"           duration="0.001" />
     *    <gs-step target="#mask"         style="zIndex:90"                         duration="0.001" />
     *    <gs-step target="#details"      style="zIndex:92; opacity:0.01; left:{{selectedTile.from.left}}; top:{{selectedTile.from.top}}; width:{{selectedTile.from.width}}; height:{{selectedTile.from.height}}"  duration="0.01"/>
     *    <gs-step target="#details"      style="opacity:1.0"                       duration="0.3" />
     *    <gs-step mark-position="fullThumb"/>
     *    <gs-step target="#details"      style="delay:0.2; left:0; height:{{selectedTile.to.height}}; width:329" duration="0.5"  />
     *    <gs-step mark-position="fullWidth"/>
     *    <gs-step target="#mask"         style="opacity:0.80"                      duration="0.5"   position="fullWidth-=0.3"/>
     *    <gs-step target="#details"      style="opacity:1; top:18; height:512"     duration="0.3"   position="fullWidth+=0.1"/>
     *    <gs-step mark-position="slideIn"/>
     *    <gs-step target="#green_status" style="zIndex:91; opacity:1; top:21;"     duration="0.001" position="slideIn"/>
     *    <gs-step target="#green_status" style="top:0"                             duration="0.2"   position="slideIn"/>
     *    <gs-step target="#details > #title"               style="height:131"      duration="0.6"   position="fullWidth" />
     *    <gs-step target="#details > #info"                style="height:56"       duration="0.5"   position="fullWidth+=0.2" />
     *    <gs-step target="#details > #title > div.content" style="opacity:1.0"     duration="0.8"   position="fullWidth+=0.3" />
     *    <gs-step target="#details > #info > div.content"  style="opacity:1"       duration="0.4"   position="fullWidth+=0.6" />
     *    <gs-step target="#details > #pause"               style="opacity:1; scale:1.0" duration="0.4"   position="fullWidth+=0.4" />
     * </gs-timeline>
     *
     */
    angular.module('gsTimelines', [ 'ng' ])
        .service(  '$timeline',   TimelineBuilder )
        .service(  '$$gsStates',  TimelineStates  )
        .directive('gsTimeline',  TimelineDirective )
        .directive('gsStep',      StepDirective )
        .directive('gsPause',     PauseDirective )
        .directive('gsScale',     ScaleDirective);


    /**
     * @ngdoc service
     * @private
     *
     * Internal State management for Timelines
     * Used to watch states and auto-trigger `timeline` animations (restart() or reverse())
     *
     * NOTE: currently this is a CRUDE architecture that does not account for hierarchical states
     * and complex animation chains...
     */
    function TimelineStates( $timeline, $log, $rootScope ) {
        var self, registry = { };

        return self = {

            addTimeline : function addTimeline(data) {
                var state = data.state;

                if ( state && state.length ) {
                    registry[ state ] = data;

                    // Only watch the state in the scope that is a parent
                    // to root timeline.

                    if ( !data.parentController ) {
                        watchState( state );
                    }
                }
            }
        };

        // ******************************************
        // Internal Accessor
        // ******************************************

        /**
         * Get the scope for the specified `state`
         */
        function scopeFor(state) {
            var data = registry[state];
            return data ? data.scope : undefined;
        }

        // ******************************************
        // Internal Methods
        // ******************************************

        /**
         *  Watch the `state` variable and autostart the Timeline instance when state
         *  changes
         */
        function watchState(state) {
            $log.debug( "TimelineStates::watchState( state = '{0}' )".supplant([state]) );

                // Ensure the key exists before $watch()
            var parent = scopeFor(state).$parent;
                parent.state = parent.state || undefined;

            // Watch for the scope `state` change... to start or reverse the animations
            // Watch for state changes and fire the associated timeline

            var unwatch = parent.$watch('state', function(current, previous){
                if ( state   === ""        ) return;
                if ( current === previous  ) return;
                if ( current === undefined ) return;

                $rootScope.$evalAsync(function(){
                    var shouldReverse = isStateReversal(current);

                    // Must use $timeline() to integrate the resolve processing...
                    $timeline(state).then( function(timeline){

                        // Pop special `-` reverse indicator (if present)
                        current = stripStateReversal(current);

                        $log.debug( ">> TimelineStates::triggerTimeline( state = '{0}' )".supplant([current]) );

                        if ( current === state ){

                          if ( shouldReverse ) timeline.reverse();
                          else                 timeline.restart();

                        }
                    });

                });

            });

            // Auto unwatch when the scope is destroyed..
            parent.$on( "$destroy", unwatch );
        }

    }

    /**
     * @ngdoc service
     *
     * Service to build a GSAP TimelineMax instance based on <gs-timeline> and nested <gs-step>
     * directive settings...
     */
    function TimelineBuilder( $log, $q  ) {
        var counter = 0,
            targets = { },
            cache   = { },
            self    = {
                state        : findByState,
                id           : findById,
                register     : register,
                makeTimeline : makeTimeline
            },

            // Add 1 or more event callbacks to the animation?
            // events : ["onComplete", "onReverseComplete", "onUpdate"]

            registerCallbacks = function(callbacks) {
                return function(tl) {
                    if ( callbacks) {
                        var events = getKeys(callbacks);

                        events.forEach(function(key){
                           tl.eventCallback(key, callbacks[key] || angular.noop, ["{self}"] );
                        });
                    }

                    // publish/provide the TimelineMax instance
                    return tl;
                }
            },

            // Chain step to resolve AFTER the timeline is ready
            // but BEFORE the timeline is delivered externally

            resolveBeforeUse= function(tl) {
                var callback = tl.$$resolveWith || angular.noop;

                return  $q.when( callback() ).then(function(){
                          return tl;
                        });
            },

            // If the timeline is dirty and needs to rebuild,
            // wait for that first.

            waitForRebuild = function(tl) {
                return (tl && tl.$$dirty) ? tl.$$dirty : tl;
            },

            // Special lookup or accessor function

            $timeline = function ( id, callbacks ){

                // Is this an implicit lookup?

                if ( angular.isDefined(id) ){
                    id = stripStateReversal(id);

                    var promise = hasState(id) ? findByState(id) : findById(id);
                    return promise
                            .then( waitForRebuild )
                            .then( registerCallbacks(callbacks) )
                            .then( resolveBeforeUse );
                }

                // Not a lookup, so return the API

                return self;
            };

        // Attach special direct search and make functions to the published
        // API for `$timeline` service

        angular.forEach(self,function(fn,key){
            $timeline[key] = fn;
        });

        // Publish the service with its API

        return $timeline;

        // ******************************************************************
        // Internal Methods
        // ******************************************************************

        /**
         * Make or update a TimelineMax instance
         *
         * @param source TimelineController
         * @param flushTargets Boolean to rebuild the query selectors
         * @returns {*} GSAP TimelineMax instance
         */
        function makeTimeline(source, flushTargets) {
            source  = source || { steps:[ ], children: [ ] };
            targets = flushTargets ? { } : targets;

            var querySelector = makeQuery( source,  targets );
            var timeline = source.timeline || new TimelineMax({paused: true, data: {id: source.id || counter++ }});

                timeline.clear(true).timeScale( source.timeScale || 1.0 );
                timeline.data.id = source.id || timeline.data.id;

            source.timeline = timeline;
            source.steps    = source.steps || [ ];
            source.children = source.children || [ ];

            source.steps.forEach(function( step ) {
                var element     = querySelector( step.target );
                var callback    = keyValue(step, "callback", null );
                var position    = keyValue(step, "position", null );
                var frameLabel  = keyValue(step, "markPosition");
                var styles      = toJSON(updateZIndex(keyValue(step, "style" )));
                var duration    = getDuration(step, styles);

                styles = updateEasing(updateBounds( styles ));

                if ( callback )                 timeline.addPause( position, callback, [timeline] );
                else if ( frameLabel )          timeline.addLabel( frameLabel, position );
                else if ( duration === 0 )      timeline.set(element, styles);
                else if ( useTweenMax(styles) ) timeline.append( TweenMax.to(element, duration,  styles), position );
                else                            timeline.to(element,  +duration, styles,  position || timeline.totalDuration() );
            });

            source.children.forEach(function(it){
                var child   = it.timeline;
                var position = keyValue(it, "position", null);

                if ( child) {
                    child.paused(false);    // Un-pause timelines when inserting in parent...

                    if ( !position ) timeline.append(child);
                    else             timeline.insert(child, position);
                }
            });

            return logBuild(source, targets, $log);
        }

        /**
         * Get explicit duration value or calculate an implicit
         * duration if certain keys are used.
         */
        function getDuration(step, styles) {
            var duration    = keyValue(step, "duration", 0);

            if ( duration === 0 ) {
                var hasPosition = !!keyValue(step, "position");

                var forceDuration = ( styles.zIndex || styles.className || styles.display );
                    forceDuration = forceDuration || hasPosition;

                if ( forceDuration ) duration = "0.001";
            }

            return duration;
        }

        /**
         * Some properties require the special powers
         * of TweenMax instead of TweenLite...
         *
         * @param styles
         * @returns {boolean|*}
         */
        function useTweenMax(styles){
            var needTweenMax = false;

            if (angular.isDefined(styles.yoyo) ) {
                needTweenMax = true;
                styles.yoyo = Boolean(styles.yoyo);
            }

            if (angular.isDefined(styles.repeat) ) {
                needTweenMax = true;
                styles.repeat = +styles.repeat;
            }

            return needTweenMax;
        }

        /**
         * Pre-toJSON scan for `z-index`; which is not a valid JSON.
         * Replace with `zIndex` key words.
         * @param styles
         */
        function updateZIndex(styles) {
            return angular.isString(styles)? styles.replace(/z-index/g,"zIndex") : styles;
        }

        /**
         * For the special `bounds` style, extract/flatten the specifiers
         */
        function updateBounds(styles) {
            if ( styles.bounds ) {
                "left top width height".split(" ").forEach(function(key) {
                    var value = styles.bounds[key];
                    if ( angular.isDefined( value ))
                    {
                        styles[key] = value;
                    }
                });
            }
            delete styles.bounds;

            return styles;
        }

        /**
         * Special lookup of the easing instance in the GSAP globals.
         * This is used to replace the easing string property chain reference
         * with an object instance
         */
        function updateEasing(styles) {
            var warning = 'TimelineBuilder::makeTimeline() - ignoring invalid easing `{0}` ';
            var invalid = true;
            var easing  = styles.ease || "";

            try {
                if ( easing.length ) {
                    var inst = window;
                    var keys = easing.split(".");

                    keys.forEach(function(key){
                        exitOnInvalid(key, inst);
                        inst = inst[key];
                    });

                    invalid = !!inst ? false : true;
                    styles.ease = inst;
                }
            }
            catch (e ) { /* suppress errors */ }
            finally    { if (invalid){ delete styles.ease; }}

            return styles;

            /**
             * If full property chain is not valid, then do not continue
             * with the ease translation lookup.
             */
            function exitOnInvalid(key, inst) {
                if ( angular.isUndefined(inst[key]) ) {
                    $log.warn( warning.supplant([easing]));
                    throw( new Error('invalid ease') );
                }
            }
        }

        /**
         * Provide a async lookup to return a timeline after
         * all $digest changes have completed.
         *
         * @param id
         * @returns {Deferred.promise|*}
         */
        function findById( id ) {
            var deferred = $q.defer();
            var timeline = cache[id];

            if ( timeline )  deferred.resolve(timeline);
            else             deferred.reject( "Timeline( id == '{0}' ) was not found.".supplant([ id ]) );

            return deferred.promise;
        }

        /**
         * Provide a async lookup to return a timeline after
         * all $digest changes have completed.
         *
         * @param state
         * @returns {Deferred.promise|*}
         */
        function findByState( state ) {
            var deferred = $q.defer();
            var timeline;

            angular.forEach(cache, function(it) {
                if ( angular.isDefined(it.$$state) ){
                    if ( it.$$state == state     )
                    {
                        timeline = it;
                    }
                }
            });

            if ( timeline )  deferred.resolve(timeline);
            else             deferred.reject( "Timeline( state == '{0}' ) was not found.".supplant([ state ]) );

            return deferred.promise;
        }

        /**
         * Scan available timelines to see if any have a matching state
         * @param state
         * @returns {boolean|*}
         */
        function hasState(state) {
            var found = false;
            angular.forEach(cache, function(it) {
                if ( angular.isDefined(it.$$state) ){
                    if ( it.$$state == state )
                    {
                        found = true;
                    }
                }
            });
            return found;
        }

        /**
         * Register timeline for easy lookups later...
         */
        function register(timeline, id, state) {
            if ( timeline && id && id.length ) {

                cache[ id ] = timeline;
                if ( angular.isDefined(state) )
                {
                    timeline.$$state = state;
                }
            }
        }
    }


    /**
     * Timeline Controller
     * Each controller manages its own timeline with its nested child steps.
     * However, a Timeline controller may be a child of a parent Timeline controller.
     *
     * @param $scope
     * @constructor
     */
    function TimeLineController($scope, $element, $q, $timeout, $timeline, $log) {
        var self             = this,
            timeline         = null,
            children         = [ ],
            steps            = [ ],
            pendingRebuild   = null,
            bouncedRebuild   = null,
            debounce         = $debounce( $timeout ),
            parentController = $element.parent().controller('gsTimeline');

        self.addStep       = onStepChanged;  // Used by StepDirective
        self.addCallback   = onAddCallback;  // Used by PauseDirectives
        self.addChild      = onAddTimeline;  // Used by TimelineDirective
        self.addResolve    = onAddResolve;   // Used by TimelineDirective

        // Rebuild when the timeScale changes..
        $scope.$watch('timeScale', function(current,previous) {
            if ( current !== previous ) {
                $log.debug( ( previous != "" ) ?
                            'timeScale( {0} -> {1} )'.supplant([previous, current]) :
                            'timeScale( {0} )'.supplant([current])
                );
                asyncRebuild();
            }
        });

        /**
         * Deferred external accessor to `timeline` to support asyncRebuild(s).
         */
        self.timeline    = function() {
            return pendingRebuild ? pendingRebuild.promise : $q.when(timeline);
        };

        // ******************************************************************
        // Internal Builder Methods
        // ******************************************************************

        /**
         * Create a `debounced` async timeline build process; this allows
         * all step changes and child timeline additions to complete before
         * rebuilding.
         */
        function asyncRebuild() {
            pendingRebuild = pendingRebuild || $q.defer();
            bouncedRebuild = bouncedRebuild || debounce( rebuildTimeline );

            // Keep debouncing...
            bouncedRebuild();

            // Temporarily mark this as dirty...
            if ( timeline != null ) timeline.$$dirty = pendingRebuild.promise;

            /**
             * Rebuild the timeline when the steps or children timelines are changed...
             */
             function rebuildTimeline() {
                 try {

                     // No rebuilding while active...
                     if ( timeline && timeline.isActive() ) {
                         timeline.kill();
                     }

                     // Build or update the TimelineMax instance
                     timeline = $timeline.makeTimeline({
                         id       : $scope.id,
                         timeline : timeline,
                         steps    : steps,
                         children : children,
                         target   : findTimelineTarget(),
                         timeScale: +$scope.timeScale || 1.0
                     });

                     // Register for easy lookups later...
                     $timeline.register( timeline, $scope.id, $scope.state );

                     // Add to parent as child timeline (if parent exists)
                     if ( parentController ) {
                         parentController.addChild( timeline, $scope.position );
                     }

                     // Then resolve promise (for external requests)
                     delete $timeline.$$dirty;
                     pendingRebuild.resolve( timeline );

                 }
                 catch( e ) { pendingRebuild.reject(e); }
                 finally    { pendingRebuild = null;    }

             }
        }

        /**
         * Scan up the parent controller ancestor chain to find the fallback
         * target, if it is not specified on the current scope.
         * @returns {*}
         */
        function findTimelineTarget() {
            var target = $scope.target;
            if ( !angular.isDefined(target) || (target == "") ) {

                var parent = $element.parent();
                var timelineCntrl = parent.controller('gsTimeline');
                var isRoot = !timelineCntrl;


                while ( timelineCntrl ) {

                    if ( hasValidTarget(parent) ) {
                        target = parent.attr("target");
                        break;
                    }

                    parent = angular.element(parent.parent());
                    timelineCntrl = parent.controller('gsTimeline');
                }
            }

            return target;

            /**
             * Has the `target="<dom selector>"` attribute been specified?
             * @param element
             * @returns {boolean|*}
             */
            function hasValidTarget(element) {
                var target = element.attr("target");
                return (angular.isDefined(target) && (target != ""));
            }
        }



        /**
         * Add a child timeline instance to this timeline parent
         *
         * @param timeline Child TimelineMax instance
         * @param position start offset in the parent timeline
         */
        function onAddTimeline(timeline, position) {
            try {
                // If not already registered...
                if ( children.indexOf(timeline) < 0 ) {
                    children.push({
                        timeline : timeline,
                        position : position
                    });
                }
            } finally {

                // Perform an async rebuild of the timeline; async to
                // respond to all changes as a single batch response.

                asyncRebuild();
            }
        }

        /**
         * Add hidden resolve callback to the timeline; which will be
         * resolved PRIOR to the resolve of the `$timeline( id )` promise.
         *
         * @param callback
         */
        function onAddResolve( callback ) {
            timeline = timeline || $timeline.makeTimeline();
            timeline.$$resolveWith = callback;
        }
        /**
         * When properties of a child step changes,
         * we need to rebuild the timeline...
         * @param step
         */
        function onStepChanged(step) {

            try{

                if ( steps.indexOf(step) < 0 ) {
                    // If not already registered...
                    steps.push(step);
                }

            } finally {

                // Perform an async rebuild of the timeline; async to
                // respond to all changes as a single batch response.

                asyncRebuild();
            }
        }

        /**
         * Add a special step that will pause the timeline progress
         * until the callback finishes or resolves.
         *
         * @param fn Function created in the `gs-pause` Directive
         * @param position
         */
        function onAddCallback(fn, position) {

            self.addStep({
                callback : wrapCallback(fn),
                position : position,
                params   : ["{self}"]
            });

            /**
             * Create wrapper function that will pause the timeline
             * while the callback is in-progress, then resume once
             * the callback finishes. If a promise is returned, then
             * the promise must be resolved before the timeline will continue
             *
             * @param fn
             * @returns {Function}
             */
            function wrapCallback(fn) {
                return function (tl) {

                    $q.when( fn() )
                      .then( function() {
                          tl.resume();
                      });

                }
            }

        }
    }


    /**
     * @ngdoc directive
     * Timeline Directive contains 0..n steps and 0..n child timelines
     *
     * @param state String constant used to auto-trigger animation with the parent scope `state` matches
     * @param timeScale Float value configures time scale of timeline instance
     * @param target String element identifier of the fallback target element for each step
     * @param resolve Expression that is evaluated before each timeline is ready to run
     * @param position String identifier that specifies the position of this timeline within a parent timeline
     *
     * @returns {{restrict: string, controller: string, link: Function}}
     * @constructor
     */
   function TimelineDirective($parse, $$gsStates) {
       var counter = 1;

       return {
           restrict: "E",
           scope : {
            timeScale : "@?"
            // state : "@?",
            // target : "@?target",
            // position : "@?position",
            // resolve : "&?resolve",
           },
           require : "^?gsTimeline",
           controller : TimeLineController,
           link : function (scope, element, attr, controller )
           {
               // Manually access these static properties

               scope.id        = attr.id        || attr.state || ("timeline_" + counter++);
               scope.position  = attr.position  || 0;
               scope.timeScale = scope.timeScale || 1.0;
               scope.state     = attr.state;
               scope.target    = attr.target;

               prepareResolve();
               prepareStateWatch();

               // ******************************************************************
               // Internal Methods
               // ******************************************************************

               /**
                * Prepare the `resolve` expression to be evaluated AFTER $digest() and BEFORE
                * the timeline instances are reconstructed...
                */
               function prepareResolve() {
                    if ( angular.isDefined(attr.resolve) )
                    {
                        var context  = scope.$parent;
                        var fn       = $parse(attr["resolve"], /* interceptorFn */ null, /* expensiveChecks */ true);

                        controller.addResolve( function(){
                            // fn() may return a promise or value;
                            // both are wrapped in $q.when(<value>)

                            return fn(context);
                        });
                    }
               }

               /**
                * Each timeline that has a state should be registered...
                */
               function prepareStateWatch() {
                   if ( angular.isDefined(attr.state) ) {

                       // Register this timeline with Timeline State management

                       $$gsStates.addTimeline({
                           scope            : scope,
                           state            : attr.state,
                           controller       : controller,
                           parentController : element.parent().controller('gsTimeline')
                       });
                   }
               }
           }
       };
   }

    /**
     * @ngdoc directive
     * Step Directive
     *
     * Steps can only be defined as children of a Timeline. Steps are used to label frames, set styles,
     * or animate 1..n sets of properties for a specific duration.
     *
     * @returns {{restrict: string, scope: {style: string, duration: string, position: string, markPosition: string, clazz: string}, require: string[], link: LinkStepDirective}}
     * @constructor
     *
     * @example:
     *
     *      <gs-step  className=""
     *                duration="0.3"
     *                position="0.1"
     *                style="opacity:1; left:{{source.left}}; top:{{source.top}}; width:{{source.width}}; height:{{source.height}};" >
     *      </gs-step>
     */
    function StepDirective() {
        return {
            restrict : "E",
            scope : {
                className    : "@?",
                duration     : "@?",
                markPosition : "@?",
                position     : "@?",
                style        : "@"
            },
            require : "^gsTimeline",
            compile : function compile(tElement, tAttrs, transclude) {
                // Convert all commas to semi-colons (for later conversion to JSON)
                if ( angular.isDefined(tAttrs.style) ) {
                    tAttrs.style = tAttrs.style.replace(/,/g,";");
                }

                return function LinkStepDirective(scope, element, attr, ctrl) {

                    scope.target = attr.target;
                    scope.$watch('style', function onChangeStep() {
                        ctrl.addStep(scope);
                    });
                }
            }
        };
    }

    /**
     * @ngdoc directive
     * Step Directive
     *
     * Steps can only be defined as children of a Timeline. Steps are used to label frames, set styles,
     * or animate 1..n sets of properties for a specific duration.
     *
     * @returns {{restrict: string, scope: {style: string, duration: string, position: string, markPosition: string, clazz: string}, require: string[], link: LinkStepDirective}}
     * @constructor
     *
     * @example:
     *
     *      <gs-step  className=""
     *                duration="0.3"
     *                position="0.1"
     *                style="opacity:1; left:{{source.left}}; top:{{source.top}}; width:{{source.width}}; height:{{source.height}};" >
     *      </gs-step>
     */
    function PauseDirective() {
        return {
            restrict : "E",
            scope : {
                resolve  : "&",
                position : "@"
            },
            require : "^gsTimeline",
            link : function LinkStepDirective(scope, element, attr, ctrl) {

                ctrl.addCallback(scope.resolve, scope.position );

            }
        };


    }

    /**
     * @ngdoc directive
     * Scale Directive
     *
     * Scale the attached element to the window inner bounds or to a fixed scale value
     *
     * Startup viewport scaling for UX; this will increase
     * the stage size to fill the window area with
     * PROPORTIONAL_FIT_INSIDE
     *
     */
    function ScaleDirective($window, $timeout) {
        return {
            restrict : "A",
            link : function LinkStepDirective(scope, element, attr) {
                var fixedScale = attr['gsScale'] ? parseFloat(attr['gsScale']) : NaN;
                var isLocked   = !isNaN(fixedScale);
                var timeline   = new TimelineMax();

                adjustScaling();

                if ( !isLocked ) {
                    // Watch resize; remove watcher during tear down.
                    scope.$on("$destroy", watchResize( adjustScaling ) );
                }

                /**
                 * Will autoAdjust the scale so the target element will proportionally
                 * fit INSIDE the window; unless an explicit size has been defined
                 *
                 *  gs-scale        === adjust scale to window size
                 *  gs-scale="1.0"  === lock scale to 1x (ignore window size)
                 *  gs-scale="3"    === lock scale to 3x (ignore window size)
                 *
                 */
                function adjustScaling() {
                    var win = {
                          width : $window.innerWidth-20,
                          height: $window.innerHeight-20
                      },
                      stage = {
                          width : element[0].clientWidth,
                          height: element[0].clientHeight
                      },
                      scaling = Math.min(
                        win.height/stage.height,
                        win.width/stage.width
                      ),
                      selector = '#' + attr.id;


                    // Scale and FadeIn entire stage for better UX

                    timeline.clear(true)
                      .set(selector, { scale:isLocked ? fixedScale : scaling, transformOrigin:"0 0 0" } )
                      .to(selector, 0.5, {opacity:1});
                }
            }
        };

        /**
         * Auto-adjust scaling when window resizes... minimize
         * the # of events to debounce until idle for 30 frames
         */
        function watchResize( targetFn ) {
            var win        = angular.element($window);
            var debounce   = $debounce($timeout, true);
            var onResizeFn = debounce(targetFn, 30);

            win.bind('resize', onResizeFn);

            // Publish unwatch method...
            return function(){
                win.unbind('resize', onResizeFn);
            }
        }
    }


    // ******************************************************************
    // Internal Debug Methods
    // ******************************************************************

    /**
     * Output the build steps and details to the console...
     *
     * @param source
     * @param targets
     * @param $log
     * @returns {*|TimelineMax}
     */
    function logBuild( source, targets, $log ) {
        $log.debug( ">> TimelineBuilder::makeTimeline() invoked by $timeline('{data.id}')".supplant(source.timeline) );

        source.steps.forEach(function( step ) {

            var frameLabel  = keyValue(step, "markPosition");
            var position    = keyValue(step, "position", "");
            var styles      = toJSON(keyValue(step, "style"));
            var hasDuration = !!keyValue(step, "duration");
            var duration    = hasDuration ? keyValue(step, "duration") : 0;

            if ( frameLabel )       $log.debug( "addLabel( '{0}' )"                       .supplant( [frameLabel] ));
            else if ( hasDuration ) $log.debug( "timeline.set( '{0}', {1},  {2}, '{3}' )" .supplant( [step.target, duration, JSON.stringify(styles), position ] ));
            else                    $log.debug( "timeline.set( '{0}', '{1}' )"            .supplant( [step.target, JSON.stringify(styles)] ));

        });

        source.children.forEach(function(it){
            if ( it.timeline ) {
                $log.debug( "$timeline('{0.data.id}').addChild( '{1.data.id}' )".supplant([source.timeline,  it.timeline]) );
            }
        });

        return source.timeline;
    }

    // ******************************************************************
    // Internal DOM Query Method
    // ******************************************************************

    /**
     * Find DOM element associated with query selector
     * Use the fallback timeline target if the step target `selector` is not
     * specified.
     *
     * @param selector
     * @returns {*}
     */
    function makeQuery( source, targets ){

        // Publish query method...
        return function querySelector( selector ) {
            selector = selector || source.target;

            var element = targets[selector];
            if ( !element ) {

                // Cache the querySelector DOM element for reuse
                targets[selector] = element = $(selector);
            }

            return element;
        }
    }

    // *****************************************************
    // Utility Methods
    // *****************************************************


    /**
     * Convert markup styles to JSON style map
     * supports nested object markup...
     * @param keyValues
     */
    function toJSON(style) {
       var result = { };
       var pairs = !style ? [ ] : style.replace(/\s+/g,"").split(/;/g);

       pairs.forEach(function(it) {
         if ( it.length ) {
           it = !isObject(it) ? it.split(":") : extractObject(it);
           var key = stripQuotes(it[0]);
           var value = it[1];

           result[ key ] = angular.isString(value) ? stripQuotes(value) : value;
         }
       });

       return result;

       function isObject(it) {
           return (it.indexOf("{")>-1) && (it.indexOf("}")>-1);
       }

       function extractObject(it) {
           var matches = it.match(/[\s]*([A-Za-z]+)[\s]*\:[\s]*\{(.*)\}/);
           var key   = matches[1];
           var value = toJSON( String(matches[2]).replace(/,/g,";").replace(/\"/g,"") );


           return [ key,  value ];
       }
    }

    /**
     * Check map for valid string value...
     * @returns {*} String || defVal
     */
    function keyValue(map, key, defVal) {
        return angular.isDefined(map[key]) && (map[key].length > 0) ? map[key] : defVal;
    }

    /**
     * Strip any "" or '' quotes
     * @returns {String}
     */
    function stripQuotes(source) {
        return source.replace(/\"/g,"").replace(/\'/g,"");
    }

    /**
     * Get array of object properties
     * @param source
     * @returns {keys}
     */
    function getKeys(source) {
        var results = [];
        for (var key in source ) {
            if ( source.hasOwnProperty(key) ) {
                results.push(key);
            }
        }
        return results;
    }

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * <wait> milliseconds. The callback will be invoked and the $digest() process initiated.
     *
     * @param func
     * @param wait
     * @param scope
     * @returns {Function}
     *
     */
    function $debounce( $timeout, invokeApply ) {

        return function debounce(func, wait, scope) {
          var timer;

          return function debounced() {
            var context = scope,
                args = Array.prototype.slice.call(arguments);

            $timeout.cancel(timer);
            timer = $timeout(function() {

                timer = undefined;
                func.apply(context, args);

            }, wait || 10, invokeApply );
          };
        }
    }


    /**
     * Scan for special prefix that indicates if the state
     * should be reversed...
     * @param state
     * @returns {boolean}
     */
    function isStateReversal(state) {
        return (state[0] == "-");
    }

    /**
     * If the id has a reverse aniamtion indicator prefixed,
     * strip that for proper lookups.
     *
     * @param state String name of state to lookup
     * @returns {string}
     */
    function stripStateReversal(state) {
        return (state[0] == "-") ? state.substr(1) : state;
    }


})(window);
