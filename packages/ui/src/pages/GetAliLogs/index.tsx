import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm, FormProvider } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getProjects, getLogstores } from '@/apis/ali';
import { AliyunProject } from '@/apis/ali/types';

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
  const [projects, setProjects] = useState<AliyunProject[]>([]);
  const [logstores, setLogstores] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('获取项目列表失败');
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
        setError(`获取项目 ${selectedProject} 的日志库列表失败`);
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
      // const response = await getLogs(projectName, logstoreName, params);

      // setLogs(response.body || []);
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
      setLoading(false);
    } catch (err) {
      setError('查询日志失败');
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
      <h1 className="text-2xl font-bold mb-6">阿里云 SLS 日志查询</h1>
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSubmit)} style={{ minHeight: 0 }} className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            <FormField
              name="projectName"
              rules={{ required: "项目名称为必填项" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目名称</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择项目" />
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
              rules={{ required: "日志库名称为必填项" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>日志库名称</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedProject || logstores.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请先选择项目" />
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
                    <FormLabel>开始时间</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="选择开始日期和时间"
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
                    <FormLabel>结束时间</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="选择结束日期和时间"
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
                  <FormLabel>查询语句</FormLabel>
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
                  <FormLabel>日志主题</FormLabel>
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
                    <FormLabel>返回行数</FormLabel>
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
                    <FormLabel>偏移量</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" className="w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>


          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? '查询中...' : '查询日志'}
          </Button>
        </form>
      </FormProvider>


      {/* {logs.length > 0 && (
        <Card className="mt-6 p-4">
          <h2 className="text-xl font-semibold mb-4">日志结果</h2>
          <div className="overflow-auto max-h-96">
            <pre className="whitespace-pre-wrap">{JSON.stringify(logs, null, 2)}</pre>
          </div>
        </Card>
      )} */}
    </div>
  );
};

export default GetAliLogs;
