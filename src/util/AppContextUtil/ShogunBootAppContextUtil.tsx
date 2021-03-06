import * as React from 'react';

import OlTileWMS from 'ol/source/TileWMS';
import OlTileLayer from 'ol/layer/Tile';
import OlImageWMS from 'ol/source/ImageWMS';
import OlImageLayer from 'ol/layer/Image';
import OlLayer from 'ol/layer/Base';
import OlLayerGroup from 'ol/layer/Group';

import * as moment from 'moment';

const union = require('lodash/union');

import isMobile from 'is-mobile';

import ZoomButton from '@terrestris/react-geo/dist/Button/ZoomButton/ZoomButton';
import ZoomToExtentButton from '@terrestris/react-geo/dist/Button/ZoomToExtentButton/ZoomToExtentButton';
import MeasureButton from '@terrestris/react-geo/dist/Button/MeasureButton/MeasureButton';

import Logger from '@terrestris/base-util/dist/Logger';
import ObjectUtil from '@terrestris/base-util/dist/ObjectUtil/ObjectUtil';

import initialState from '../../state/initialState';

import PrintButton from '../../component/button/PrintButton/PrintButton';
import MeasureMenuButton from '../../component/button/MeasureMenuButton/MeasureMenuButton';
import HsiButton from '../../component/button/HsiButton/HsiButton';

import Application from '../../model/Application';
import Layer from '../../model/Layer';

import LayerService from '../../service/LayerSerivce/LayerService';

import BaseAppContextUtil, { AppContextUtil } from './BaseAppContextUtil';

const layerService = new LayerService();

/**
 * This class provides some methods which can be used with the appContext of SHOGun-Boot.
 */
class ShogunBootAppContextUtil extends BaseAppContextUtil implements AppContextUtil {

  canReadCurrentAppContext() {
    const appMode = typeof(APP_MODE) != 'undefined' ? APP_MODE : '';

    return appMode.indexOf('boot') > -1;
  }

  /**
   * This method parses an appContext object as delivered by SHOGun-Boot and returns
   * an storeObject as expected by the redux store.
   * @param {Object} appContext The appContext.
   * @return {Object} The initialState used by the store.
   */
  async appContextToState(appContext: Application) {

    const state: any = initialState;
    const mapConfig = appContext.clientConfig.mapView;
    const activeModules = appContext.toolConfig;
    const defaultTopic = '';
    const layerTree = appContext.layerTree;

    // appInfo
    state.appInfo.name = appContext.name || state.appInfo.name;

    // mapView
    state.mapView.present.center = [
      mapConfig.center[0],
      mapConfig.center[1]
    ];
    state.mapView.present.mapExtent = [
      mapConfig.extent[0],
      mapConfig.extent[1],
      mapConfig.extent[2],
      mapConfig.extent[3],
    ];
    state.mapView.present.projection = mapConfig.projection.indexOf('EPSG:') < 0
      ? 'EPSG:' + mapConfig.projection : mapConfig.projection;
    state.mapView.present.resolutions = mapConfig.resolutions;
    state.mapView.present.zoom = mapConfig.zoom;

    // mapLayers
    state.mapLayers = await this.parseLayertree(layerTree);

    // activeModules
    state.activeModules = union(state.activeModules, activeModules);

    // defaultTopic
    state.defaultTopic = defaultTopic;

    // mapScales
    state.mapScales = this.getMapScales(mapConfig.resolutions);

    state.appContext = appContext;

    return state;
  }

  async parseLayertree(folder: any) {
    const nodes = await this.parseNodes(folder.children);
    const tree = new OlLayerGroup({
      layers: nodes.reverse(),
      visible: folder.checked,
    });
    return tree;
  }

  async parseNodes (nodes: any[]) {
    const collection: OlLayer[] = [];

    for (const node of nodes) {
      if (node.children) {
        collection.push(await this.parseFolder(node));
      } else {
        const layer: Layer = await layerService.findOne(node.layerId);

        const olLayer = this.parseLayer(layer);

        olLayer.setVisible(node.checked);

        collection.push(olLayer);
      }
    }

    return collection;
  }

  async parseFolder(el: any) {
    const layers = await this.parseNodes(el.children);
    const folder = new OlLayerGroup({
      layers: layers.reverse(),
      visible: el.checked
    });
    folder.set('name', el.title);
    return folder;
  }

  /**
   * Parses an array of maplayer objects and returns an array of ol.layer.Layers.
   *
   * @param {Array} mapLayerObjArray An array of layerObjects like we get them
   *                                 from the backend.
   * @return {Array} An array of ol.layer.Layer.
   */
  parseLayer(layer: Layer): OlLayer {
    let olLayer: OlLayer;

    if ([
      'ImageWMS',
      'TileWMS',
      'WMTS',
      'WMSTime'
    ].indexOf(layer.type) < 0) {
      Logger.warn('Currently only TileWMS, ImageWMS, WMSTime and OSMVectortiles layers are supported.');
    }

    // if (layer.source.type === 'WMTS') {
    //   const {
    //     attribution,
    //     visible,
    //     opacity,
    //     hoverable,
    //     hoverTemplate,
    //     legendUrl
    //   } = layer.appearance;

    //   const wmtsTileGrid = new OlTileGridWMTS({
    //     origin: layer.source.tileGrid.origin,
    //     resolutions: layer.source.tileGrid.resolutions,
    //     matrixIds: layer.source.tileGrid.matrixIds
    //   });

    //   const wmtsSource = new OlSourceWMTS({
    //     projection: layer.source.projection,
    //     urls: [
    //       layer.source.url
    //     ],
    //     layer: layer.source.layerNames,
    //     format: layer.source.format,
    //     matrixSet: layer.source.tileMatrixSet,
    //     attributions: [attribution],
    //     tileGrid: wmtsTileGrid,
    //     style: layer.source.style,
    //     requestEncoding: layer.source.requestEncoding
    //   });

    //   const tileLayer = new OlTileLayer({
    //     source: wmtsSource,
    //     visible: visible,
    //     opacity: opacity
    //   });

    //   tileLayer.set('name', layer.name);
    //   tileLayer.set('hoverable', hoverable);
    //   tileLayer.set('hoverTemplate', hoverTemplate);
    //   tileLayer.set('type', 'WMTS');
    //   tileLayer.set('legendUrl', legendUrl);
    //   tileLayer.set('isBaseLayer', layer.isBaseLayer);
    //   tileLayer.set('isDefault', layer.isDefault);
    //   tileLayer.set('topic', layer.topic);
    //   tileLayer.set('staticImageUrl', layer.staticImageUrl);
    //   tileLayer.set('convertFeatureInfoValue', layer.convertFeatureInfoValue || false);
    //   tileLayer.set('previewImageRequestUrl', layer.previewImageRequestUrl);
    //   tileLayer.set('timeFormat', layer.source.timeFormat);
    //   tileLayer.set('description', layer.description);
    //   tileLayer.set('metadataIdentifier', layer.metadataIdentifier);
    //   tileLayer.set('displayColumns', layer.displayColumns);
    //   tileLayer.set('columnAliasesDe', layer.columnAliasesDe);
    //   tileLayer.set('columnAliasesEn', layer.columnAliasesEn);
    //   tileLayer.set('legendUrl', layer.legendUrl);
    //   tileLayer.set('searchable', layer.searchable);
    //   tileLayer.set('searchConfig', layer.searchConfig);
    //   layers.push(tileLayer);
    //   return;
    // }

    // const tileGridObj = ObjectUtil.getValue('tileGrid', layer.source);
    // let tileGrid;
    // if (tileGridObj) {
    //   tileGrid = find(tileGrids, function (o: any) {
    //     return isEqual(o.getTileSize()[0], tileGridObj.tileSize) &&
    //       isEqual(o.getTileSize()[1], tileGridObj.tileSize);
    //   });
    // }

    if (layer.type === 'WMS') {
      olLayer = this.parseImageLayer(layer);
    }

    if (layer.type === 'TILEWMS') {
      olLayer = this.parseTileLayer(layer);
    }

    return olLayer;
  }

  /**
   * Parse and create a tile layer.
   * @return {ol.layer.Tile} the new layer
   */
  parseTileLayer(layer: Layer) {
    const {
      url,
      layerNames,
      crossOrigin,
      requestWithTiled = true,
      transparent = true,
      attribution,
      timeFormat,
      type,
      legendUrl,
      startDate,
      endDate
      // tileSize = 512,
      // resolutions = [],
      // extent
    } = layer.sourceConfig;

    const {
      opacity,
      hoverable,
      hoverTemplate
    } = layer.clientConfig;

    const defaultFormat = timeFormat || 'YYYY-MM-DD';

    // const tileGrid = new OlTileGrid({
    //   resolutions: resolutions,
    //   tileSize: [tileSize, tileSize],
    //   extent: [
    //     extent[0],
    //     extent[1],
    //     extent[2],
    //     extent[3]
    //   ]
    // });

    const layerSource = new OlTileWMS({
      url: url,
      attributions: attribution,
      // tileGrid: tileGrid,
      params: {
        'LAYERS': layerNames,
        'TILED': requestWithTiled,
        'TRANSPARENT': transparent
      },
      crossOrigin: crossOrigin
    });

    if (type === 'WMSTime') {
      layerSource.getParams().TIME = moment(moment.now()).format(defaultFormat);
    }

    const tileLayer = new OlTileLayer({
      source: layerSource,
      opacity: opacity
    });

    tileLayer.set('name', layer.name);
    tileLayer.set('hoverable', hoverable);
    tileLayer.set('hoverTemplate', hoverTemplate);
    tileLayer.set('type', type);
    tileLayer.set('legendUrl', legendUrl);
    tileLayer.set('timeFormat', defaultFormat);

    if (type === 'WMSTime') {
      tileLayer.set('startDate', startDate ? moment(startDate).format(defaultFormat) : undefined);
      tileLayer.set('endDate', endDate ? moment(endDate).format(defaultFormat) : undefined);
    }

    return tileLayer;
  }

  /**
   * Parse and create a single tile WMS layer.
   * @return {ol.layer.Image} the new layer
   */
  parseImageLayer(layer: Layer) {
    const {
      attribution,
      legendUrl,
      url,
      layerNames,
    } = layer.sourceConfig;

    const {
      opacity,
      hoverable,
      hoverTemplate,
      crossOrigin,
    } = layer.clientConfig;

    const layerSource = new OlImageWMS({
      url: url,
      attributions: attribution,
      params: {
        'LAYERS': layerNames,
        'TRANSPARENT': true
      },
      crossOrigin: crossOrigin
    });

    const imageLayer = new OlImageLayer({
      source: layerSource,
      opacity: opacity
    });

    imageLayer.set('name', layer.name);
    imageLayer.set('hoverable', hoverable);
    imageLayer.set('hoverTemplate', hoverTemplate);
    imageLayer.set('type', layer.type);
    imageLayer.set('legendUrl', legendUrl);

    return imageLayer;
  }

  /**
   * TODO: Missing features:
   * "shogun-button-stepback",
   * "shogun-button-stepforward",
   * "shogun-button-showredliningtoolspanel"
   * "shogun-button-showworkstatetoolspanel"
   * "shogun-button-addwms"
   * "shogun-button-showmetapanel"
   * @param activeModules
   * @param map
   * @param appContext
   */
  getToolsForToolbar(activeModules: Array<any>, map: any,
    appContext: any, t: (arg: string) => string, config?: any) {
    const tools: any[] = [];
    const mapConfig = ObjectUtil.getValue('mapConfig', appContext);
    const isMobileClient = isMobile();

    activeModules.forEach((module: any) => {
      if (module.hidden) {
        return;
      }
      switch (module.xtype) {
        case 'basigx-button-zoomin':
          tools.push(<ZoomButton
            delta={1}
            map={map}
            key="1"
            type="primary"
            shape="circle"
            iconName="fas fa-plus"
            tooltip={t('ZoomIn.tooltip')}
            tooltipPlacement={'right'}
          />);
          return;
        case 'basigx-button-zoomout':
          tools.push(<ZoomButton
            delta={-1}
            map={map}
            key="2"
            type="primary"
            shape="circle"
            iconName="fas fa-minus"
            tooltip={t('ZoomOut.tooltip')}
            tooltipPlacement={'right'}
          />);
          return;
        case 'shogun-button-zoomtoextent':
          tools.push(<ZoomToExtentButton
            center={[
              mapConfig.center.x,
              mapConfig.center.y
            ]}
            zoom={mapConfig.zoom}
            map={map}
            key="3"
            type="primary"
            shape="circle"
            iconName="fas fa-expand"
          />);
          return;
        case 'shogun-button-print':
          tools.push(<PrintButton
            map={map}
            key="4"
            type="primary"
            shape="circle"
            iconName="fas fa-print"
            config={config}
            tooltip={t('PrintPanel.windowTitle')}
            tooltipPlacement={'right'}
            printScales={this.getMapScales(mapConfig.resolutions)}
            t={t}
          />);
          return;
        case 'basigx-button-hsi':
          tools.push(<HsiButton
            map={map}
            key="5"
            tooltip={t('FeatureInfo.tooltip')}
            tooltipPlacement={'right'}
            t={t}
            getInfoByClick={isMobileClient}
          />);
          return;
        case 'shogun-button-measure-menu':
          if (module.properties.measureTypes.length === 1) {
            tools.push(<MeasureButton
              map={map}
              measureType={module.properties.measureTypes[0]}
              key="6"
              tooltip={t('FeatureInfo.tooltip')}
              tooltipPlacement={'right'}
              showMeasureInfoOnClickedPoints={true}
            />);
          } else {
            tools.push(<MeasureMenuButton
              type="primary"
              shape="circle"
              map={map}
              measureTypes={module.properties.measureTypes}
              key="6"
              tooltip={t('FeatureInfo.tooltip')}
              t={t}
            />);
          }
          return;
        default:
          return;
      }

    });
    return tools.sort((a, b) => {
      if (a.key < b.key) {
        return -1;
      }
      if (a.key > b.key) {
        return 1;
      }
      return 0;
    });
  }

  measureToolsEnabled(activeModules: Array<any>) {
    return activeModules.map((module: any) =>
      module.xtype === 'shogun-button-showmeasuretoolspanel').indexOf(true) > -1;
  }

}

export default ShogunBootAppContextUtil;
