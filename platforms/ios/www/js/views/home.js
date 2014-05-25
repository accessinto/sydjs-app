(function() {
	
	new View('home', {
		
		initialize: function() {
		
			//
		
		},
		
		on: {
			layout: function() {
				
				var availableHeight = app.viewportSize.height
					- this.$('.titlebar').height()
					- this.$('.toolbar').height();
					
				this.$('.container').css({
					height: availableHeight,
					top: this.$('.titlebar').height()
				});
				
			},
			visible: function() {
				
				this.setNotifications();
				this.setMeetup();
				this.setState();
				
				// Analytics
				// app.trackEvent( 'googleanalytics', 'Rewards', { category: 'view', action: 'visible' } );
				// app.trackEvent( 'mixpanel', 'Viewing Rewards', {} );
				
			}
		},
		
		buttons: {
			'.btn-notifications': 'toggleNotifications',
			'.btn-talks': 'toggleTalks',
			
			'.btn-calendar': 'addCalendar',
			
			'.rsvp .btn-attending': 'rsvpAttending',
			'.rsvp .btn-not-attending': 'rsvpNotAttending',
			
			'.rsvp-not-attending .btn-cancel': 'rsvpCancel',
			
			'.rsvp-attending .btn-cancel': 'rsvpCancel'
		},
		
		toggleNotifications: function() {
		
			if (!app.data.session) {
				app.showConfirm('Notifications', 'Sign in and receive useful notifications, such as new meetups announcements.', 'No‚ thanks,Sign in', function(pressed) {
					if (pressed == 2) app.view('signin').show('slide-down');
				});
				return;
			}
			
			var self = this;
			
			var user = app.data.session;
			
			if (user.services.pushNotifications.isConfigured) {
				if (user.services.pushNotifications.enabled) {
					app.showLoadingSpinner();
					app.disableNotifications(function() {
						self.setNotifications();
						app.hideLoadingSpinner();
					});
				} else {
					app.showLoadingSpinner();
					app.enableNotifications(function() {
						self.setNotifications();
						app.hideLoadingSpinner();
					});
				}
			} else {
				app.showConfirm('New Meetups', 'Would you like a notification when a new meetup is announced?', 'No‚ thanks,Notify Me', function(pressed) {
					switch(pressed) {
						case 1: // No
							// app.showNotification('Alert', 'User declined enable notifications.');
						break;
						case 2: // Yes
							app.showLoadingSpinner();
							app.enableNotifications(function() {
								self.setNotifications();
								app.hideLoadingSpinner();
							});
						break;
					}
				});
			}
		
		},
		
		toggleTalks: function() {
			
			this.$('.states').velocity({
				translateX: 0,
				translateY: 0
			}, {
				duration: 300,
				easing: 'easeOutSine'
			});
			
			app.view('talks').show('slide-down');
			
		},
		
		setNotifications: function() {
		
			if (!app.data.session) return;
			
			var user = app.data.session;
			
			// Push Notifications
			var $notifications = this.$('.btn-notifications');
			
			$notifications.html('<img src="img/ui/icon-alarm-white.svg" />');
			
			if (user.services.pushNotifications.isConfigured && user.services.pushNotifications.enabled) {
				$notifications.html('<img src="img/ui/icon-alarm-green.svg" />');
			}
		
		},
		
		setMeetup: function() {
		
			var meetup = app.data.meetup;
			
			var $talks = this.$('.btn-talks');
			
			var $days = this.$('.meetup-days'),
				$date = this.$('.meetup-date');
			
			var $calendar = this.$('.btn-calendar');
			
			$days.html(meetup ? moment(meetup.date).diff(moment(), 'days') + ' Days' : 'Standby');
			$date.html(meetup ? moment(meetup.date).format('ddd, DD MMMM YYYY') : 'Sharkie\'s on it...');
			
			$calendar[meetup ? 'show' : 'hide']();
			$talks[meetup ? 'show' : 'hide']();
			
			meetup && $calendar.find('.number').html(moment(meetup.date).format('DD'));
		
		},
		
		addCalendar: function() {
			
			var meetup = app.data.meetup;
			
			var startDate = moment(meetup.date).add('hours', 18).toDate(),
				endDate = moment(meetup.date).add('hours', 21).toDate();
			
			var title = 'SydJS',
				location = 'Level 6, 341 George St',
				notes = meetup.name;
			
			var success = function(message) { alert("Success: " + JSON.stringify(message)); },
				error = function(message) { alert("Error: " + message); };
			
			var reminders = {
				firstReminderMinutes: 60,
				secondReminderMinutes: null
			}
			
			window.plugins.calendar.createEventWithOptions(title,location,notes,startDate,endDate,reminders,success,error);
			
		},
		
		setState: function() {
		
			var meetup = app.data.meetup,
				user = app.data.session;
			
			// RSVP States
			var $states = this.$('.states');
			
			var $rsvp = $states.find('.rsvp'),
				$rsvpNotAttending = $states.find('.rsvp-not-attending'),
				$rsvpAttending = $states.find('.rsvp-attending'),
				$soldOut = $states.find('.sold-out'),
				$ticketsSoon = $states.find('.tickets-soon');
			
			$rsvp.hide();
			$rsvpNotAttending.hide();
			$rsvpAttending.hide();
			$soldOut.hide();
			$ticketsSoon.hide();
			
			if (meetup.rsvped && meetup.attending) {
				$rsvpAttending.show();
			} else if (meetup.rsvped && !meetup.attending) {
				$rsvpNotAttending.show();
			} else if (meetup.ticketsAvailable && meetup.ticketsRemaining) {
				$rsvp.show();
			} else if (meetup.ticketsAvailable && meetup.ticketsAvailable == 0) {
				$soldOut.show();
			} else {
				$ticketsSoon.show();
			}
			
			// Animate in state
			$states.css('transform', 'translate3d(0,0,0)');
			
			setTimeout(function() {
				$states.velocity({
					translateX: 0,
					translateY: -75
				}, {
					duration: 250,
					easing: 'easeOutSine'
				});
			}, 150);
			
		},
		
		toggleAttending: function(options) {
		
			if (!app.data.session) {
				app.showConfirm('Notifications', 'You must sign in to mark your attendance.', 'No‚ thanks,Sign in', function(pressed) {
					if (pressed == 2) app.view('signin').show('slide-down');
				});
				return;
			}
			
			var self = this;
			
			var user = app.data.session;
			
			var rsvpData = {
				user: user.userId,
				meetup: app.data.meetup.id,
				attending: options.attending,
				cancel: options.cancel
			};
			
			$.ajax({
				url: config.baseURL + '/api/app/rsvp',
				type: 'post',
				data: rsvpData,
				dataType: 'json',
				cache: false,
				success: function(rtnData) {
					
					if (rtnData.success) {
					
						$log( "[toggleAttending] - RSVP successful.", rtnData );
						
						// Update local cached data
						app.data.meetup.attending = rsvpData.attending;
						app.data.meetup.rsvped = !options.cancel ? true : false;
						
						// Hide loading spinner
						app.hideLoadingSpinner();
						
						// Set form to no longer processing
						self._processingForm = false;
						
						// Update status
						self.$('.states').velocity({
							translateX: 0,
							translateY: 0
						}, {
							duration: 250,
							easing: 'easeOutSine',
							complete: function() {
								self.setState();
							}
						});
					
					} else {
						
						$log( "[toggleAttending] - Password check failed, advise user to retry details.", rtnData );
						
						// Hide loading spinner
						app.hideLoadingSpinner();
						
						// Set form to no longer processing
						self._processingForm = false;
						
						// Show message
						app.showNotification('Alert', 'Sorry, we couldn\'t validate your password, please try again.');
					
					}
					
				},
				error: function(request, errType, err) {
					
					$log( "[toggleAttending] - Update failed, advise user to retry details." );
					
					// Hide loading spinner
					app.hideLoadingSpinner();
					
					// Set form to no longer processing
					self._processingForm = false;
					
					// Show message
					app.showNotification('Alert', 'Sorry, we couldn\'t validate your password, please try again.');
				
				}
			});
		
		},
		
		rsvpAttending: function() {
			this.toggleAttending({ attending: true });
		},
		
		rsvpNotAttending: function() {
			this.toggleAttending({ attending: false });
		},
		
		rsvpCancel: function() {
			this.toggleAttending({ attending: false, cancel: true });
		}
		
	});
	
})();
