/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-this-alias */
import {IInputs, IOutputs} from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.PropertyTypes.DataSet;

interface mapOptions {
    zoom: number;
    scrollwheel: boolean;
    center?: google.maps.LatLng; 
}


export class GoogleMapsGrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    //Reference to the PCF context input object
    private _context: ComponentFramework.Context<IInputs>;
    // Event Handler 'refreshData' reference
    private _refreshData: EventListenerOrEventListenerObject;

    // PCF framework delegate which will be assigned to this object which would be called whenever any update happens. 
    private _notifyOutputChanged: () => void;

    //contains all the elements for the control
    private _container: HTMLDivElement;

    private _mapDiv: HTMLDivElement;

    private gMap: google.maps.Map;

    public mapOptions: mapOptions;

	/**
	 * Empty constructor.
	 */
	constructor()
	{

	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement)
	{
        //debugger;
        console.log("Init Function");
        //control initialization code
        this._context = context;
        this._container = document.createElement("div");
        this._notifyOutputChanged = notifyOutputChanged;
        //this._refreshData = this.refreshData.bind(this);

        //Append Google Maps Script reference
        const headerScript: HTMLScriptElement = document.createElement("script");
        headerScript.type = 'text/javascript';
        headerScript.id = "GoogleHeaderScript";
        const apiKey = context.parameters.googleMapsAPIKey.raw != null && context.parameters.googleMapsAPIKey.raw != "val" ? context.parameters.googleMapsAPIKey.raw : "";
        headerScript.src = "https://maps.googleapis.com/maps/api/js?key=" + apiKey;
        headerScript.onload = this.initMap;
        document.body.appendChild(headerScript);

        this._mapDiv = document.createElement("div");
        this._mapDiv.setAttribute("id", "mapDiv");
        this._mapDiv.setAttribute("style", "position:relative;width:100%;height:80vh;border-style: solid;margin:auto;");
        this._container.appendChild(this._mapDiv);
        //Associate controls to container
        container.appendChild(this._container);
	}

    public initMap() {
        //debugger;
        console.log("Init map called");
        this.mapOptions = {
            zoom: 10,
            scrollwheel: false,
            center: new google.maps.LatLng(0, 0)
        };
        const mapDiv = document.getElementById('mapDiv');
        if (mapDiv !== null) {
            // Xử lý khi không tìm thấy phần tử với id 'mapDiv'
            this.gMap = new google.maps.Map(document.getElementById('mapDiv') as HTMLElement,
                this.mapOptions);
            const self = this;
            //Get Users Current Location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    self.gMap.setCenter(pos);
                    self.mapOptions.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                }, function () {
                    //handleLocationError(true, infoWindow, map.getCenter());
                    //do nothing because we have set the center as 0 0 as a backup
                });
            }
        } else {
           console.log("Error: mapDiv not found")
        }
    }


	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void
	{
        // Add code to update control view
        console.log("update view called");
        this.initMap();
        const LocalMap = this.gMap;
        const dataSet = context.parameters.mapDataSet;
        const latField: string = context.parameters.latFieldName.raw ? context.parameters.latFieldName.raw : "35";
        const longField: string = context.parameters.longFieldName.raw ? context.parameters.longFieldName.raw : "139";
        const nameField: string = context.parameters.primaryFieldName.raw ? context.parameters.primaryFieldName.raw : "marker";

        console.log("input dataSet: " + JSON.stringify(dataSet));
        console.log("input latField: " + latField);
        console.log("input longField: " + longField);
        console.log("input nameField: " + nameField);

        if (dataSet == null || latField == "" || longField == "") {
            return;
        }

        const infowindow = new google.maps.InfoWindow();

        if (latField != "" && longField != "") {
            const myLatLng = { lat: parseFloat(latField), lng: parseFloat(longField) };
            const marker = new google.maps.Marker({
                position: myLatLng,
                map: this.gMap,
                title: nameField
            });

            google.maps.event.addListener(marker, 'click', (function (marker, content) {
                return function () {
                    infowindow.open(LocalMap, marker);
                }
            })(marker));

            this.gMap.setCenter(myLatLng);
            console.log("added marker");
        }
        
        for (let i = 0; i < dataSet.paging.totalResultCount; i++) {
            console.log("i: " + i);
            const recordId = dataSet.sortedRecordIds[i];
            const record = dataSet.records[recordId.toString()] as DataSetInterfaces.EntityRecord;
            const content = this.buildInforWindow(dataSet.getTargetEntityType(), recordId, record, dataSet.columns);
            const myLatLng = { lat: parseFloat(record.getFormattedValue("latFieldName") as string) || 35, lng: parseFloat(record.getFormattedValue("longFieldName") as string) || 139 };

            console.log("lat: " + myLatLng.lat);
            console.log("long: " + myLatLng.lng);

            const marker = new google.maps.Marker({
                position: myLatLng,
                map: this.gMap,
                title: record.getFormattedValue("primaryFieldName") as string
            });

            google.maps.event.addListener(marker, 'click', (function (marker, content) {
                return function () {
                    infowindow.setContent(content);
                    infowindow.open(LocalMap, marker);
                }
            })(marker, content));

            this.gMap.setCenter(myLatLng);
        }

     
        this.gMap = LocalMap;       
    }
    
   /**
    * Function to build an information window for a given location marker
    * @param recEntityType
    * @param recId
    * @param rec
    * @param cols The columns to use to display information in the info window
    */
    public buildInforWindow(recEntityType: string, recId: string, rec: DataSetInterfaces.EntityRecord, cols: DataSetInterfaces.Column[]): HTMLDivElement {
        const divTag = document.createElement("div");
        divTag.id = recId;

        let content = "";
        // const primaryField: string = this._context.parameters.primaryFieldName.raw ? this._context.parameters.primaryFieldName.raw : "";
        const titleString = rec.getFormattedValue("primaryFieldName").toString();
        const titleTag = document.createElement("a");
        titleTag.href = "#";
        titleTag.className = "infoTitle";
        titleTag.innerHTML = titleString;
        divTag.appendChild(titleTag);

        //initialise table
        content = content.concat("</br></br><table class='infotable'>");
        for (let i = 0; i < cols.length; i++) {
            //add exclusion criteria to exclude lat,long, primary field and id
            // if (cols[i].name != this._context.parameters.latFieldName.raw &&
            //     cols[i].name != this._context.parameters.primaryFieldName.raw &&
            //     cols[i].name != this._context.parameters.longFieldName.raw) {
                //create row of data
                content = content.concat("<tr><th class='infoth'>" + cols[i].displayName + ": </th>");
                const strValue = rec.getFormattedValue(cols[i].name) != null ? rec.getFormattedValue(cols[i].name) : "";
                content = content.concat("<td class='infotd'> " + strValue + "</td></tr>");
            // }
        }
        //close table
        content = content.concat("</table>");

        const contentHTML: HTMLElement = document.createElement("span");
        contentHTML.innerHTML = content;
        divTag.appendChild(contentHTML);

        google.maps.event.addDomListener(titleTag, 'click', this.openRecord.bind(null, this._context, titleString, recEntityType, recId), false);
        return divTag;
    }

    /**
     * Function to open a record based on supplied record details
     * @param context
     * @param recName
     * @param recType
     * @param recId
     */
    public openRecord(context: ComponentFramework.Context<IInputs>, recName: string, recType: string, recId: string): void {
        //var recordRef: ComponentFramework.EntityReference = {
        //    entityType: recType,
        //    id: recId,
        //    name: recName
        //};
        const entityFormOptions = {
            entityName: recType,
            entityId: recId,
        }
        // context.parameters.mapDataSet.openDatasetItem(recordRef);
        context.navigation.openForm(entityFormOptions);
        //the other option is to build a url using context.page.appId?

    }

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs
	{
		return {};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void
	{
		// Add code to cleanup control if necessary
	}

}