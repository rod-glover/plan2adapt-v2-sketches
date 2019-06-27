import React, { Component } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { map, filter, slice, curry } from 'lodash/fp';

import regions from '../../../assets/regions';
import timePeriods from '../../../assets/time-periods';
import seasons from '../../../assets/seasons';
import variables from '../../../assets/variables';
import meta from '../../../assets/meta';
import summary from '../../../assets/summary';
import rulebase from '../../../assets/rulebase';
import ruleValues from '../../../assets/rule-results';

import T from '../../../utils/external-text';
import AppHeader from '../AppHeader';

import RegionSelector from '../../selectors/RegionSelector/RegionSelector';
import TimePeriodSelector from '../../selectors/TimePeriodSelector/TimePeriodSelector';
import SeasonSelector from '../../selectors/SeasonSelector/SeasonSelector';
import VariableSelector from '../../selectors/VariableSelector/VariableSelector';
import SelectorLabel from '../../misc/SelectorLabel/SelectorLabel';

import ChangeOverTimeGraph from '../../data-displays/ChangeOverTimeGraph/ChangeOverTimeGraph';
import Impacts from '../../data-displays/impacts/Impacts';
import Rules from '../../data-displays/impacts/Rules';
import TwoDataMaps from '../../maps/TwoDataMaps/TwoDataMaps';

import styles from './App.css';
import Table from 'react-bootstrap/Table';
import Summary from '../../data-displays/Summary';

const baselineTimePeriod = {
  start_date: 1961,
  end_date: 1990,
};

export default class App extends Component {
  state = {
    region: regions[0],
    futureTimePeriod: timePeriods[0],
    season: seasons[0],
    variable: variables[0],
  };

  handleChangeSelection = (name, value) => this.setState({ [name]: value });
  handleChangeRegion = this.handleChangeSelection.bind(this, 'region');
  handleChangeTimePeriod = this.handleChangeSelection.bind(this, 'futureTimePeriod');
  handleChangeSeason = this.handleChangeSelection.bind(this, 'season');
  handleChangeVariable = this.handleChangeSelection.bind(this, 'variable');

  render() {
    return (
      <Container fluid>
        <AppHeader/>

        <Row>
          <Col xl={2} lg={12} md={12}>
            {/* TODO: Extract this as a separate component? */}
            <div className='MainSelectors'>
              <Row>
                <Col>
                  <T item='mainSelectors.prologue'/>
                </Col>
              </Row>
              <Row>
                <Col xl={12} lg={'auto'} md={'auto'} className='pr-0'>
                  <T item='mainSelectors.seasonPrefix'/>
                </Col>
                <Col xl={12} lg={2} md={3}>
                  <SeasonSelector
                    value={this.state.season}
                    onChange={this.handleChangeSeason}
                  />
                </Col>
                <Col xl={12} lg={'auto'} md={'auto'} className='pr-0'>
                  <T item='mainSelectors.regionPrefix'/>
                </Col>
                <Col xl={12} lg={3} md={6}>
                  <RegionSelector
                    value={this.state.region}
                    onChange={this.handleChangeRegion}
                  />
                </Col>
                <Col xl={12} lg={'auto'} md={'auto'} className='pr-0'>
                  <T item='mainSelectors.periodPrefix'/>
                </Col>
                <Col xl={12} lg={3} md={4}>
                  <TimePeriodSelector
                    bases={filter(m => +m.start_date >= 2010)(meta)}
                    value={this.state.futureTimePeriod}
                    onChange={this.handleChangeTimePeriod}
                  />
                </Col>
              </Row>
            </div>
          </Col>

          <Col xl={10} lg={12} md={12}>
            <Tabs
              id={'main'}
              defaultActiveKey={'Impacts'}
            >
              <Tab
                eventKey={'Summary'}
                title={<T as='string' item='summary.tab'/>}
                className='pt-2'
              >
                {/*<T item='summary.title' context={{*/}
                {/*  region: this.state.region.label,*/}
                {/*  futureTimePeriod: this.state.futureTimePeriod.value.shorthand*/}
                {/*}}/>*/}
                <Summary summary={summary}/>
                <T item='summary.notes.general' context={{
                  region: this.state.region.label,
                  futureTimePeriod: this.state.futureTimePeriod.value,
                  baselineTimePeriod,
                }}/>
                <T item='summary.notes.derivedVars'/>
              </Tab>

              <Tab
                eventKey={'Impacts'}
                title={<T as='string' item='impacts.tab'/>}
                className='pt-2'
              >
                <Row>
                  <Col lg={12}>
                    <T item='impacts.prologue' context={{
                      region: this.state.region.label,
                      futureTimePeriod: this.state.futureTimePeriod.value,
                      baselineTimePeriod,
                    }}/>
                    <Tabs
                      id={'impacts'}
                      defaultActiveKey={'rules'}
                    >
                      <Tab
                        eventKey={'by-category'}
                        title={'By Category'}
                        className='pt-2'
                      >
                        <Impacts
                          rulebase={rulebase}
                          ruleValues={ruleValues}
                          groupKey='category'
                          itemKey='sector'
                          groupHeading='Impact Category'
                          itemsHeading='Affected Sectors'
                        />
                      </Tab>
                      <Tab
                        eventKey={'by-sector'}
                        title={'By Sector'}
                        className='pt-2'
                      >
                        <Impacts
                          rulebase={rulebase}
                          ruleValues={ruleValues}
                          groupKey='sector'
                          itemKey='category'
                          groupHeading='Affected Sector'
                          itemsHeading='Impact Categories'
                        />
                      </Tab>
                      <Tab
                        eventKey={'rules'}
                        title={'Rules Logic'}
                        className='pt-2'
                      >
                        <Rules
                          rulebase={rulebase}
                          ruleValues={ruleValues}
                        />
                      </Tab>
                    </Tabs>
                  </Col>
                </Row>
              </Tab>

              <Tab
                eventKey={'Maps'}
                title={<T as='string' item='maps.tab'/>}
                className='pt-2'
              >
                <Row>
                  <Col xs={'auto'} className='pr-0'>
                    <T item='fragments.variablePrefix'/>
                  </Col>
                  <Col sm={4} xs={6}>
                    <VariableSelector
                      bases={meta}
                      value={this.state.variable}
                      onChange={this.handleChangeVariable}
                    />
                  </Col>
                </Row>
                <Row>
                  <Col lg={12}>
                    <T item='maps.title' context={{
                      season: this.state.season.label,
                      variable: this.state.variable.label,
                      region: this.state.region.label,
                    }}/>
                  </Col>
                </Row>
                <TwoDataMaps
                  region={this.state.region.value}
                  historicalTimePeriod={{
                    start_date: 1961,
                    end_date: 1990,
                  }}
                  futureTimePeriod={this.state.futureTimePeriod.value}
                  season={this.state.season.value}
                  variable={this.state.variable.value}
                />
              </Tab>

              <Tab
                eventKey={'Graph'}
                title={<T as='string' item='graph.tab'/>}
                className='pt-2'
              >
                <Row>
                  <Col lg={2}>
                    <T item='fragments.variablePrefix'/>
                    <VariableSelector
                      bases={meta}
                      value={this.state.variable}
                      onChange={this.handleChangeVariable}
                    />
                  </Col>
                </Row>
                <Row>
                  <Col lg={12}>
                    <T item='graph.title' context={{
                      season: this.state.season.label,
                      variable: this.state.variable.label,
                      region: this.state.region.label,
                    }}/>
                  </Col>
                  <Col lg={6}>
                    <ChangeOverTimeGraph
                      {...this.state}
                    />
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Container>
    );
  }
}
