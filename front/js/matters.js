// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.html)
// to persist Backbone models within your browser.

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){

    // Matter Model
    // ----------

    // Our basic **Matter** model has `title`, `order`, and `done` attributes.
    var Matter = Backbone.Model.extend({

        // Default attributes for the matter item.
        defaults: function() {
            return {
                title: "empty matter...",
                order: Matters.nextOrder(),
                date: this.getDate(),
                reply: []
            };
        },
        getDate: function() {
            var nowdate = new Date();
            var str = "" + nowdate.getFullYear() + "-";
            str += (nowdate.getMonth()+1) + "-";
            str += nowdate.getDate();
            return str;
        },
        // Toggle the `done` state of this matter item.
        toggle: function() {
            this.save({done: !this.get("done")});
        },
    });

    // Matter Collection
    // ---------------

    // The collection of matters is backed by *localStorage* instead of a remote
    // server.
    var MatterList = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: Matter,

        // Save all of the matter items under the `"matters-backbone"` namespace.
        localStorage: new Backbone.LocalStorage("matters-backbone1"),

        // We keep the Matters in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function() {
            if (!this.length) return 1;
            return this.last().get('order') + 1;
        },

        // Matters are sorted by their original insertion order.
        comparator: 'order'

    });

    // Create our global collection of **Matters**.
    var Matters = new MatterList;

    var ModalView = Backbone.View.extend({

        el: $("#matterModal"),
        replytemplate: _.template($('#reply-template').html()),
        events: {
            "click #edit-matter":  "editMatter"
        },
        model: null,
        initialize: function() {
            this.title = this.$(".modal-title");
            this.titleinput = this.$("input[name='title']");
            this.body = this.$(".modal-body");
            this.replyinput = this.$("input[name='reply']");
            this.footer = this.$(".modal-footer");

            this.$el.on('hidden.bs.modal', this.hidden);
            this.render();
        },
        setModel: function(model) {
            this.model = model;
            this.modaldata = this.model.toJSON();
        },
        hidden: function() {
            $("#replylist").remove();
            $(".modal-footer").css("display", "none");
            $("input[name='title']").hide();
            $("input[name='reply']").val("").hide();
        },
        render: function() {
            // this.modaldata = this.model.toJSON();
        },
        show: function() {
            this.$el.modal('show');
        },
        hide: function() {
            this.$el.modal('hide');
        },
        showTitle: function() {
            this.title.text(this.modaldata.title).show();
            this.titleinput.hide();
        },
        showTileinput: function() {
            this.titleinput.val(this.modaldata.title).show();
            this.title.hide();
            this.titleinput.focus();
        },
        showReplyinput: function() {
            this.replyinput.show();

            if (this.modaldata.reply.length === 0) {
                $("#replylist").remove();
            }

        },
        showBody: function() {
           this.body.append(this.replytemplate({reply: this.modaldata.reply}));
        },
        showFooter: function() {
            this.footer.show();
        },
        editMatter: function() {

            if (this.titleinput.is(":visible")) {
                var titleval = $.trim(this.titleinput.val());
                if (titleval === '') {
                    alert('title not null');
                    return false;
                }

                this.model.save({title: titleval});
                this.hide();

            }

            if (this.replyinput.is(":visible")) {
                var replyval = $.trim(this.replyinput.val());
                if (replyval === '') {
                    alert('reply not null');
                    return false;
                }


                this.modaldata.reply.push({con: replyval});
                this.model.save({reply: this.modaldata.reply});
                this.hide();

            }
        }

    });

    var Modal = new ModalView;

    // Matter Item View
    // --------------

    // The DOM element for a matter item...
    var MatterView = Backbone.View.extend({

        //... is a list tag.
        tagName:  "li",

        // Cache the template function for a single item.
        template: _.template($('#item-template').html()),

        // The DOM events specific to an item.
        events: {
        	"click .detail"   : "showDetail",
        	"click .edit"   : "edit",
        	"click .remove"   : "delMatter",
        	"click .reply" : "reply"
        },

        // The MatterView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Matter** and a **MatterView** in this
        // app, we set a direct reference on the model for convenience.
        initialize: function() {
        	this.listenTo(this.model, 'change', this.render);
        	this.listenTo(this.model, 'destroy', this.remove);
        },

        // Re-render the titles of the matter item.
        render: function() {
        	this.$el.html(this.template(this.model.toJSON()));
        	return this;
        },

        showDetail: function() {
        	Modal.setModel(this.model);
        	Modal.show();
        	Modal.showTitle();
        	Modal.showBody();

        },
        edit: function() {
        	Modal.setModel(this.model);
        	Modal.show();
        	Modal.showTileinput();
        	Modal.showBody();
        	Modal.showFooter();
        },
        reply: function() {
        	Modal.setModel(this.model);
        	Modal.show();
        	Modal.showTitle();
        	Modal.showBody();
        	Modal.showReplyinput();
        	Modal.showFooter();
        },
        delMatter: function() {
        	var self=this;
        	$.confirm({
                title: 'ARE YOU SURE ?',
        		content: false,
        		theme: 'white',
        		closeIcon: true,
        		confirm: function(){
        			self.clear();
        		}
        	});
        },
        clear: function() {
        	this.model.destroy();
        }

    });


    // The Application
    // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    var AppView = Backbone.View.extend({

        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        el: $(".container-fluid"),

        // Our template for the line of statistics at the bottom of the app.
        // statsTemplate: _.template($('#stats-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
        	"keypress #add-matter":  "addMatter",
        	"keypress #search-matter": "searchMatter"
        },

        // At initialization we bind to the relevant events on the `Matters`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting matters that might be saved in *localStorage*.
        initialize: function() {

        	this.addInput = this.$("#add-matter");
            this.searchInput = this.$("#search-matter");
            this.matterList = this.$("#matter-list");

        	this.listenTo(Matters, 'add', this.addOne);
        	this.listenTo(Matters, 'reset', this.addAll);
        	this.listenTo(Matters, 'all', this.render);

        	Matters.fetch();
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render: function() {
        },

        // Add a single matter item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function(matter) {
        	var view = new MatterView({model: matter});
        	this.matterList.append(view.render().el);
        },

        // Add all items in the **Matters** collection at once.
        addAll: function() {
        	Matters.each(this.addOne, this);
        },

        // If you hit return in the main input field, create new **Matter** model,
        // persisting it to *localStorage*.
        addMatter: function(e) {
        	if (e.keyCode != 13) return;
        	if (!this.addInput.val()) return;

        	Matters.create({title: this.addInput.val()});
        	this.addInput.val('');
        },
        searchMatter: function(e) {
            if (e.keyCode != 13) return;

            this.matterList.empty();

            if (!this.searchInput.val()) {
                Matters.reset();
                Matters.fetch();
            }
        	var selectMatters= Matters.where({title: this.searchInput.val()});
            if (selectMatters.length === 0) return;
            Matters.reset(selectMatters);
            this.searchInput.val('');
        }

    });

    // Finally, we kick things off by creating the **App**.
    var App = new AppView;

});
