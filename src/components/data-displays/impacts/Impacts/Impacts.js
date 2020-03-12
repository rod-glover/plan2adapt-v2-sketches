import PropTypes from 'prop-types';
import React from 'react';
import { Table, Accordion, Card, CardGroup } from 'react-bootstrap';
import { filter, flow, groupBy, map, mapValues, sortBy, uniq, toPairs, join } from 'lodash/fp';
import ReactMarkdown from 'react-markdown';
import withAsyncData from '../../../../HOCs/withAsyncData';
import { loadRulesResults, shouldLoadRulesResults } from '../common';
import ImpactIcon from '../ImpactIcon';
import './Impacts.css';


const sort = sortBy(x => x);


class Impacts extends React.Component {
  // This is a pure (state-free), controlled component that renders the entire
  // content of Impacts.
  //
  // This component is wrapped with `withAsyncData` to inject the rule values
  // (prop `ruleValues`) that are fetched asynchronously, according to the
  // selected region and climatological time period.

  static propTypes = {
    rulebase: PropTypes.array.isRequired,
    region: PropTypes.object.isRequired,
    futureTimePeriod: PropTypes.object.isRequired,
    ruleValues: PropTypes.object.isRequired,
    groupKey: PropTypes.string.isRequired,
    itemKey: PropTypes.string.isRequired,
    groupHeading: PropTypes.element.isRequired,
    itemsHeading: PropTypes.element.isRequired,
  };

  render() {
    const rulesByGroupKey =
      groupBy(rule => rule[this.props.groupKey])(this.props.rulebase);

    const activeItemsByGroupKey =
      mapValues(
        flow(
          filter(rule => this.props.ruleValues[rule.id]),
          map(rule => rule[this.props.itemKey]),
          uniq,
          sort,
        )
      )(rulesByGroupKey);

    const sortedActiveItemsByGroupKey = flow(
      toPairs,
      sortBy(([category, sectors]) => category)
    )(activeItemsByGroupKey);

    return (
      <CardGroup className='Impacts-table'>
        <Accordion>
          <Card>
            <Accordion.Toggle as={Card.Body} eventKey={'none'}>
              <div className='clearfix'>
                <Card.Title className='float-left mr-5'>{this.props.groupHeading}</Card.Title>
                <Card.Title className='float-right'>{this.props.itemsHeading}</Card.Title>
              </div>
            </Accordion.Toggle>
          </Card>

          {
            map(([key, items]) => (
              key.length > 0 && items.length > 0 &&
                  <Card>
                    <Accordion.Toggle as={Card.Header} eventKey={key}>
                      <div className='clearfix'>
                        <div className='float-left mr-5'>
                          <ImpactIcon kind={this.props.groupKey} icon={key}/>
                          {key}
                        </div>
                        <div className='float-right'>
                          {
                            map(item => (
                              <ImpactIcon kind={this.props.itemKey} icon={item}/>
                            ))(items)
                          }
                        </div>
                        <div/>
                      </div>
                    </Accordion.Toggle>
                    <Accordion.Collapse eventKey={key}>
                      <Card.Body className='details p-2'>
                        {
                          map(rule => (
                            <Card className='mb-1'>
                              <Card.Header>
                                <ImpactIcon
                                  kind={this.props.itemKey}
                                  icon={rule[this.props.itemKey]}
                                />
                                {rule.effects} ({rule.id})
                              </Card.Header>
                              <Card.Body>
                                <ReactMarkdown source={rule.notes} escapeHtml={false}/>
                              </Card.Body>
                            </Card>
                          ))(rulesByGroupKey[key])
                        }
                      </Card.Body>
                    </Accordion.Collapse>
                  </Card>
            ))(sortedActiveItemsByGroupKey)
          }
        </Accordion>
      </CardGroup>
      );
  }
}


export default withAsyncData(
  loadRulesResults, shouldLoadRulesResults, 'ruleValues'
)(Impacts);
