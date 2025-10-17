import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm, FormProvider } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getProjects, getLogstores, getLogs } from '@/apis/ali';
import { AliyunProject } from '@/apis/ali/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import usePageAlone from '@/hooks/usePageAlone';
import LogViewer from './components/LogViewer';

const requests = new Set<string>();

interface LogFormValues {
  projectName: string;
  logstoreName: string;
  from?: number;
  to?: number;
  query?: string;
  topic?: string;
  line?: number;
  offset?: number;
  reverse?: boolean;
  powerSql?: boolean;
}

const GetAliLogs: React.FC = () => {
  const { pageAlone } = usePageAlone();
  const [logs, setLogs] = useState<string[]>([]);
  const [projects, setProjects] = useState<AliyunProject[]>([]);
  const [logstores, setLogstores] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const methods = useForm<LogFormValues>({
    defaultValues: {
      from: Math.floor((Date.now() - 3600000) / 1000), // 1 hour ago
      to: Math.floor(Date.now() / 1000), // now
      query: '*',
      line: 100,
      offset: 0,
      reverse: false,
      powerSql: false,
    }
  });

  const { watch } = methods;
  const selectedProject = watch('projectName');

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await getProjects();
        setProjects(projectsData.body.projects || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch project list');
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch logstores when project changes
  useEffect(() => {
    if (!selectedProject) {
      setLogstores([]);
      return;
    }

    const fetchLogstores = async () => {
      try {
        setLoading(true);
        const logstoresData = await getLogstores(selectedProject);
        const logstoresList = logstoresData.body.logstores;
        setLogstores(logstoresList);
        setLoading(false);
      } catch (err) {
        setError(`Failed to fetch logstores for project ${selectedProject}`);
        setLoading(false);
      }
    };

    fetchLogstores();
  }, [selectedProject]);

  const handleSubmit = async (data: LogFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const { projectName, logstoreName, ...params } = data;
      if (pageAlone) {
        const response = await getLogs(projectName, logstoreName, params);

        setLogs(response.body || []);
      } else {
        const messageId = crypto.randomUUID();

        // Store a callback to handle the response for this specific request.
        requests.add(messageId);

        // Send the request to the host.
        window.parent.postMessage(
          {
            type: "Tool",
            messageId,
            payload: {
              requestType: "get-ali-logs",
              params: {
                projectName,
                logstoreName,
                params,
              },
            },
          },
          "*"
        );
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to query logs');
      setLoading(false);
    }
  };

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const { type, messageId, payload } = event.data;

      // Check if it's a response to a request we're waiting for.
      if (!messageId || !requests.has(messageId)) {
        return;
      }

      if (type === "ui-message-received") {
        // The host has acknowledged the request. You can update the UI.
        console.log(`Request ${messageId} is being processed...`);
        // e.g., show a more specific loading indicator.
      }

      if (type === "ui-message-response") {
        console.log('payload', payload)


        // Clean up the request from the map.
        requests.delete(messageId);
      }
    });
  }, []);

  return (
    <div className="container mx-auto p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ali Cloud SLS Log Query</h1>
        {
          pageAlone &&
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Expand Query Form ▼' : 'Collapse Query Form ▲'}
          </Button>
        }
        {
          !pageAlone &&
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(`${window.location.href}&alone=true`, '_blank')}
          >
            Open in New Tab
          </Button>
        }
      </div>
      {error && (
        <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)} className={cn("space-y-4 min-h-0 flex flex-col", {
          "flex-1": !isCollapsed
        })}>
          {!isCollapsed && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
              <FormField
                name="projectName"
                rules={{ required: "Project name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => {
                            const displayText = `${project.projectName}${project.description ? ` (${project.description})` : ''}`;
                            return (
                              <SelectItem key={project.projectName} value={project.projectName}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate max-w-[400px]">
                                      {displayText}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{displayText}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="logstoreName"
                rules={{ required: "Logstore name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logstore Name</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedProject || logstores.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Please select a project first" />
                        </SelectTrigger>
                        <SelectContent>
                          {logstores.map((logstore) => (
                            <SelectItem key={logstore} value={logstore}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate max-w-[400px]">
                                    {logstore}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{logstore}</p>
                                </TooltipContent>
                              </Tooltip>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date and time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date and time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Statement</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log Topic</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="line"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lines to Return</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="offset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offset</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Querying...' : 'Query Logs'}
          </Button>
        </form>
      </FormProvider>


      {logs.length > 0 && (
        <Card className="mt-6 p-4 min-h-0 flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Log Results</h2>
          <LogViewer logs={logs} />
        </Card>
      )}
    </div>
  );
};

export default GetAliLogs;
