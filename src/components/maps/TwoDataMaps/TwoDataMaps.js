// This component renders two `DataMap`s, one with a baseline climate layer
// and one with a user-selected climate layer. Map viewports are coordinated.
// That is, when one map's viewport is changed (panned, zoomed), the other
// map's viewport is set to the same value.
//
// Note on viewport coordination code.
//
// We pass in a simple handler as `onViewportChanged` to each `DataMap`.
// This callback is called when a change of viewport (pan, zoom) is
// complete, and does not fire continuously during such changes, as
// `onViewportChange` (no d) does.
//
// User experience would be smoother if we used the callback `onViewportChange`,
// but viewport change events are generated at a very high rate during active
// changes, and this swamps the UI. (This may also be because there is
// some kind of compounding of events between the two maps. Debugging
// code (now removed) showed that even after a single change to the
// viewport (`state.viewport`), the second map calls back with a slightly
// different viewport, which then updates the first map.)
//
// Change events can easily be throttled (use `_.throttle`), but a wait time
// of at least 100 ms is required to prevent event swamping. That leads to
// jerky, laggy tracking of one viewport by the other. It was judged
// a better user experience simply to have the other viewport updated once
// at the end of changing.

import PropTypes from 'prop-types';
import React from 'react';
import { Row, Col } from 'react-bootstrap';
import T from 'pcic-react-external-text';
import DataMap from '../../maps/DataMap';
import BCBaseMap from '../BCBaseMap';


export default class TwoDataMaps extends React.Component {
  static propTypes = {
    region: PropTypes.string,
    historicalTimePeriod: PropTypes.object,
    futureTimePeriod: PropTypes.object,
    season: PropTypes.string,
    variable: PropTypes.string,
    metadata: PropTypes.array,
  };

  state = {
    viewport: BCBaseMap.initialViewport,
    popup: {
      isOpen: false,
    },
  };

  handleChangeSelection = (name, value) => this.setState({ [name]: value });
  handleChangeViewport = this.handleChangeSelection.bind(this, 'viewport');
  handleChangePopup = this.handleChangeSelection.bind(this, 'popup');

  render() {
    return (
      <Row>
        <Col lg={6}>
          <T path='maps.historical.title' data={{
            start_date: this.props.historicalTimePeriod.start_date,
            end_date: this.props.historicalTimePeriod.end_date
          }}/>
          <DataMap
            id={'historical'}
            viewport={this.state.viewport}
            onViewportChanged={this.handleChangeViewport}
            popup={this.state.popup}
            onPopupChange={this.handleChangePopup}
            region={this.props.region}
            season={this.props.season}
            variable={this.props.variable}
            timePeriod={this.props.historicalTimePeriod}
            metadata={this.props.metadata}
          />
        </Col>
        <Col lg={6}>
          <T path='maps.projected.title' data={{
            start_date: this.props.futureTimePeriod.start_date,
            end_date: this.props.futureTimePeriod.end_date
          }}/>
          <DataMap
            id={'projected'}
            viewport={this.state.viewport}
            onViewportChanged={this.handleChangeViewport}
            popup={this.state.popup}
            onPopupChange={this.handleChangePopup}
            region={this.props.region}
            season={this.props.season}
            variable={this.props.variable}
            timePeriod={this.props.futureTimePeriod}
            metadata={this.props.metadata}
          />
        </Col>
      </Row>
    );
  }
}
